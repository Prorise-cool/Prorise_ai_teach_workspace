package org.dromara.system.controller.monitor;

import cn.dev33.satoken.annotation.SaCheckPermission;
import cn.dev33.satoken.exception.NotLoginException;
import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.bean.BeanUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dromara.common.core.constant.CacheConstants;
import org.dromara.common.core.domain.R;
import org.dromara.common.core.domain.dto.UserOnlineDTO;
import org.dromara.common.core.utils.StreamUtils;
import org.dromara.common.core.utils.StringUtils;
import org.dromara.common.idempotent.annotation.RepeatSubmit;
import org.dromara.common.log.annotation.Log;
import org.dromara.common.log.enums.BusinessType;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.common.redis.utils.RedisUtils;
import org.dromara.common.web.core.BaseController;
import org.dromara.system.domain.SysUserOnline;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 在线用户监控
 *
 * @author Lion Li
 */
@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping("/monitor/online")
public class SysUserOnlineController extends BaseController {

    /**
     * 读取单条 ONLINE_TOKEN 缓存；遇到历史脏数据（codec 不兼容导致反序列化异常）时
     * 记 warn 并删除该 key 让其自愈，返回 null 由调用方 filter 掉，避免整个监控接口 500。
     *
     * 相关：Redisson TypedJsonJacksonCodec + default typing(NON_FINAL) 要求
     * WRAPPER_ARRAY 格式；codec 升级前写入的 key 读不了会抛 MismatchedInputException。
     */
    private UserOnlineDTO readOnlineTokenSafely(String token) {
        String key = CacheConstants.ONLINE_TOKEN_KEY + token;
        try {
            return RedisUtils.getCacheObject(key);
        } catch (Exception ex) {
            log.warn("读取在线 token 缓存失败，清理脏 key 让其自愈：{}，原因：{}", key, ex.getMessage());
            try {
                RedisUtils.deleteObject(key);
            } catch (Exception ignored) {
                // 删除失败不再放大异常，脏 key 会随 TTL 过期
            }
            return null;
        }
    }

    /**
     * 获取在线用户监控列表
     *
     * @param ipaddr   IP地址
     * @param userName 用户名
     */
    @SaCheckPermission("monitor:online:list")
    @GetMapping("/list")
    public TableDataInfo<SysUserOnline> list(String ipaddr, String userName) {
        // 获取所有未过期的 token
        Collection<String> keys = RedisUtils.keys(CacheConstants.ONLINE_TOKEN_KEY + "*");
        List<UserOnlineDTO> userOnlineDTOList = new ArrayList<>();
        for (String key : keys) {
            String token = StringUtils.substringAfterLast(key, ":");
            // 如果已经过期则跳过
            if (StpUtil.stpLogic.getTokenActiveTimeoutByToken(token) < -1) {
                continue;
            }
            userOnlineDTOList.add(readOnlineTokenSafely(token));
        }
        if (StringUtils.isNotEmpty(ipaddr) && StringUtils.isNotEmpty(userName)) {
            userOnlineDTOList = StreamUtils.filter(userOnlineDTOList, userOnline ->
                StringUtils.equals(ipaddr, userOnline.getIpaddr()) &&
                    StringUtils.equals(userName, userOnline.getUserName())
            );
        } else if (StringUtils.isNotEmpty(ipaddr)) {
            userOnlineDTOList = StreamUtils.filter(userOnlineDTOList, userOnline ->
                StringUtils.equals(ipaddr, userOnline.getIpaddr())
            );
        } else if (StringUtils.isNotEmpty(userName)) {
            userOnlineDTOList = StreamUtils.filter(userOnlineDTOList, userOnline ->
                StringUtils.equals(userName, userOnline.getUserName())
            );
        }
        Collections.reverse(userOnlineDTOList);
        userOnlineDTOList.removeAll(Collections.singleton(null));
        List<SysUserOnline> userOnlineList = BeanUtil.copyToList(userOnlineDTOList, SysUserOnline.class);
        return TableDataInfo.build(userOnlineList);
    }

    /**
     * 强退用户
     *
     * @param tokenId token值
     */
    @SaCheckPermission("monitor:online:forceLogout")
    @Log(title = "在线用户", businessType = BusinessType.FORCE)
    @RepeatSubmit()
    @DeleteMapping("/{tokenId}")
    public R<Void> forceLogout(@PathVariable String tokenId) {
        try {
            StpUtil.kickoutByTokenValue(tokenId);
        } catch (NotLoginException ignored) {
        }
        return R.ok();
    }

    /**
     * 获取当前用户登录在线设备
     */
    @GetMapping()
    public TableDataInfo<SysUserOnline> getInfo() {
        // 获取指定账号 id 的 token 集合
        List<String> tokenIds = StpUtil.getTokenValueListByLoginId(StpUtil.getLoginIdAsString());
        List<UserOnlineDTO> userOnlineDTOList = tokenIds.stream()
            .filter(token -> StpUtil.stpLogic.getTokenActiveTimeoutByToken(token) >= -1)
            .map(this::readOnlineTokenSafely)
            .collect(Collectors.toList());
        //复制和处理 SysUserOnline 对象列表
        Collections.reverse(userOnlineDTOList);
        userOnlineDTOList.removeAll(Collections.singleton(null));
        List<SysUserOnline> userOnlineList = BeanUtil.copyToList(userOnlineDTOList, SysUserOnline.class);
        return TableDataInfo.build(userOnlineList);
    }

    /**
     * 强退当前在线设备
     *
     * @param tokenId token值
     */
    @Log(title = "在线设备", businessType = BusinessType.FORCE)
    @RepeatSubmit()
    @DeleteMapping("/myself/{tokenId}")
    public R<Void> remove(@PathVariable("tokenId") String tokenId) {
        try {
            // 获取指定账号 id 的 token 集合
            List<String> keys = StpUtil.getTokenValueListByLoginId(StpUtil.getLoginIdAsString());
            keys.stream()
                .filter(key -> key.equals(tokenId))
                .findFirst()
                .ifPresent(key -> StpUtil.kickoutByTokenValue(tokenId));
        } catch (NotLoginException ignored) {
        }
        return R.ok();
    }

}
