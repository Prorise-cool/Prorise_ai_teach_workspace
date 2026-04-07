package org.dromara.xiaomai.ai.runtime.mapper;

import org.apache.ibatis.annotations.Param;
import org.dromara.common.mybatis.core.mapper.BaseMapperPlus;
import org.dromara.xiaomai.ai.module.domain.XmAiModule;
import org.dromara.xiaomai.ai.runtime.domain.vo.XmAiRuntimeBindingRowVo;

import java.util.List;

/**
 * AI runtime internal 聚合查询 Mapper。
 *
 * @author Codex
 */
public interface XmAiRuntimeConfigMapper extends BaseMapperPlus<XmAiModule, XmAiRuntimeBindingRowVo> {

    List<XmAiRuntimeBindingRowVo> selectModuleRuntimeBindings(
        @Param("tenantId") String tenantId,
        @Param("moduleCode") String moduleCode
    );
}
