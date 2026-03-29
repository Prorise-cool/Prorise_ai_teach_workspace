package org.dromara.xiaomai.domain.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.List;

/**
 * 小麦模块边界总览。
 *
 * @author Codex
 */
@Data
public class XmModuleBoundaryVo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 模块 artifactId。
     */
    private String artifactId;

    /**
     * Java 包根。
     */
    private String basePackage;

    /**
     * 后台根菜单。
     */
    private String rootMenuName;

    /**
     * SpringDoc 分组。
     */
    private String springDocGroup;

    /**
     * 是否保持核心认证不变。
     */
    private Boolean coreAuthUnchanged;

    /**
     * 是否允许 FastAPI 自建平行 RBAC。
     */
    private Boolean parallelRbacAllowed;

    /**
     * 是否仅后台可见。
     */
    private Boolean adminOnly;

    /**
     * 是否开放新的 ToB 产品域。
     */
    private Boolean productDomainEnabled;

    /**
     * FastAPI 协作约束。
     */
    private String fastapiContract;

    /**
     * 目录扩展点。
     */
    private List<String> extensionDirectories;

    /**
     * 模块资源规划。
     */
    private List<XmModuleResourceVo> resources;
}
