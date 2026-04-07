package org.dromara.xiaomai.integration.controller.internal;

import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.domain.R;
import org.dromara.xiaomai.ai.runtime.domain.vo.XmAiRuntimeConfigVo;
import org.dromara.xiaomai.ai.runtime.service.XmAiRuntimeConfigService;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * FastAPI provider runtime internal 配置控制器。
 *
 * @author Codex
 */
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/internal/xiaomai/ai/runtime-config")
public class XmAiRuntimeConfigController {

    private final XmAiRuntimeConfigService xmAiRuntimeConfigService;

    @GetMapping("/modules/{moduleCode}")
    public R<XmAiRuntimeConfigVo> getModuleRuntime(
        @NotBlank(message = "moduleCode 不能为空")
        @PathVariable String moduleCode
    ) {
        XmAiRuntimeConfigVo data = xmAiRuntimeConfigService.queryModuleRuntime(moduleCode);
        return data == null
            ? R.fail(HttpStatus.NOT_FOUND.value(), "AI runtime module not found")
            : R.ok(data);
    }
}
