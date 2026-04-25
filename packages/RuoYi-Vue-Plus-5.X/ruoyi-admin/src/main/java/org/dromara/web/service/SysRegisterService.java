package org.dromara.web.service;

import cn.hutool.crypto.digest.BCrypt;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dromara.common.core.constant.Constants;
import org.dromara.common.core.constant.GlobalConstants;
import org.dromara.common.core.domain.model.RegisterBody;
import org.dromara.common.core.enums.UserType;
import org.dromara.common.core.exception.user.CaptchaException;
import org.dromara.common.core.exception.user.CaptchaExpireException;
import org.dromara.common.core.exception.user.UserException;
import org.dromara.common.core.utils.MessageUtils;
import org.dromara.common.core.utils.ServletUtils;
import org.dromara.common.core.utils.SpringUtils;
import org.dromara.common.core.utils.StringUtils;
import org.dromara.common.log.event.LogininforEvent;
import org.dromara.common.mybatis.helper.DataPermissionHelper;
import org.dromara.common.redis.utils.RedisUtils;
import org.dromara.common.tenant.helper.TenantHelper;
import org.dromara.common.web.config.properties.CaptchaProperties;
import org.dromara.system.domain.SysUser;
import org.dromara.system.domain.bo.SysUserBo;
import org.dromara.system.mapper.SysUserMapper;
import org.dromara.system.service.ISysUserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Arrays;

/**
 * 注册校验方法
 *
 * @author Lion Li
 */
@Slf4j
@RequiredArgsConstructor
@Service
public class SysRegisterService {

    private final ISysUserService userService;
    private final SysUserMapper userMapper;
    private final CaptchaProperties captchaProperties;

    /**
     * 注册时自动绑定的默认角色 ID 列表（逗号分隔）。
     * 例如 "5" 表示绑定学员角色；留空则不绑定（保留 RuoYi 原始行为）。
     */
    @Value("${user.register.defaultRoleIds:}")
    private String defaultRoleIds;

    /**
     * 注册
     */
    public void register(RegisterBody registerBody) {
        String tenantId = registerBody.getTenantId();
        String username = registerBody.getUsername();
        String password = registerBody.getPassword();
        // 校验用户类型是否存在
        String userType = UserType.getUserType(registerBody.getUserType()).getUserType();

        boolean captchaEnabled = captchaProperties.getEnable();
        // 验证码开关
        if (captchaEnabled) {
            validateCaptcha(tenantId, username, registerBody.getCode(), registerBody.getUuid());
        }
        SysUserBo sysUser = new SysUserBo();
        sysUser.setUserName(username);
        sysUser.setNickName(username);
        sysUser.setPassword(BCrypt.hashpw(password));
        sysUser.setUserType(userType);

        boolean exist = TenantHelper.dynamic(tenantId, () -> {
            return userMapper.exists(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUserName, sysUser.getUserName()));
        });
        if (exist) {
            throw new UserException("user.register.save.error", username);
        }
        boolean regFlag = userService.registerUser(sysUser, tenantId);
        if (!regFlag) {
            throw new UserException("user.register.error");
        }
        bindDefaultRoles(tenantId, username);
        recordLogininfor(tenantId, username, Constants.REGISTER, MessageUtils.message("user.register.success"));
    }

    /**
     * 给刚注册的用户绑定默认角色，避免新用户因 sys_user_role 无记录而被全局 Sa-Token 权限拦截。
     * 失败仅打日志、不阻断注册流程（保证注册可用性）。
     */
    private void bindDefaultRoles(String tenantId, String username) {
        if (StringUtils.isBlank(defaultRoleIds)) {
            return;
        }
        Long[] roleIds = Arrays.stream(defaultRoleIds.split(","))
            .map(String::trim)
            .filter(StringUtils::isNotBlank)
            .map(Long::parseLong)
            .toArray(Long[]::new);
        if (roleIds.length == 0) {
            return;
        }
        // 注册请求可能携带旧的 frozen Authorization 头，会触发 MyBatis 数据权限拦截器调用
        // LoginHelper.getLoginUser() 进而抛 NotLoginException(token 已被冻结)。
        // 用 DataPermissionHelper.ignore() 直接短路掉数据权限处理，全程不读上下文 token。
        try {
            DataPermissionHelper.ignore(() ->
                TenantHelper.dynamic(tenantId, () -> {
                    SysUser created = userMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                        .eq(SysUser::getUserName, username)
                        .select(SysUser::getUserId));
                    if (created == null) {
                        log.warn("[register] 绑定默认角色失败: 找不到刚注册的用户 username={}", username);
                        return null;
                    }
                    userService.insertUserAuth(created.getUserId(), roleIds);
                    return null;
                })
            );
        } catch (Throwable e) {
            // Throwable 而非 Exception：MyBatis/Tenant 包装层有可能抛非 Exception 子类（如 UndeclaredThrowableException 已处理，但 Error 也兜住）
            log.error("[register] 绑定默认角色异常 username={} roleIds={}", username, defaultRoleIds, e);
        }
    }

    /**
     * 校验验证码
     *
     * @param username 用户名
     * @param code     验证码
     * @param uuid     唯一标识
     */
    public void validateCaptcha(String tenantId, String username, String code, String uuid) {
        String verifyKey = GlobalConstants.CAPTCHA_CODE_KEY + StringUtils.blankToDefault(uuid, "");
        String captcha = RedisUtils.getCacheObject(verifyKey);
        RedisUtils.deleteObject(verifyKey);
        if (captcha == null) {
            recordLogininfor(tenantId, username, Constants.LOGIN_FAIL, MessageUtils.message("user.jcaptcha.expire"));
            throw new CaptchaExpireException();
        }
        if (!StringUtils.equalsIgnoreCase(code, captcha)) {
            recordLogininfor(tenantId, username, Constants.LOGIN_FAIL, MessageUtils.message("user.jcaptcha.error"));
            throw new CaptchaException();
        }
    }

    /**
     * 记录登录信息
     *
     * @param tenantId 租户ID
     * @param username 用户名
     * @param status   状态
     * @param message  消息内容
     * @return
     */
    private void recordLogininfor(String tenantId, String username, String status, String message) {
        LogininforEvent logininforEvent = new LogininforEvent();
        logininforEvent.setTenantId(tenantId);
        logininforEvent.setUsername(username);
        logininforEvent.setStatus(status);
        logininforEvent.setMessage(message);
        logininforEvent.setRequest(ServletUtils.getRequest());
        SpringUtils.context().publishEvent(logininforEvent);
    }

}
