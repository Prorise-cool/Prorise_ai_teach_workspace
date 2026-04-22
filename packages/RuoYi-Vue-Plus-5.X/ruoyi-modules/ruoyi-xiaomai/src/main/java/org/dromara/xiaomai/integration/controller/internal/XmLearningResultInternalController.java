package org.dromara.xiaomai.integration.controller.internal;

import lombok.RequiredArgsConstructor;
import org.dromara.common.core.domain.R;
import org.dromara.xiaomai.learning.domain.vo.QuizHistoryVo;
import org.dromara.xiaomai.learning.service.ILearningResultService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * FastAPI -> RuoYi 学习结果只读查询内部控制器。
 *
 * <p>供 FastAPI 防腐层调用；未登录也可访问（走内部网络信任），错误走 HTTP 状态码而非 R.fail。</p>
 *
 * @author Codex
 */
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/internal/xiaomai/learning")
public class XmLearningResultInternalController {

    private final ILearningResultService learningResultService;

    /**
     * 按 quizId（对应 xm_quiz_result.source_result_id 或 detail_ref）回看一次测验明细。
     *
     * <p>未找到时返回 HTTP 404，便于 FastAPI 侧根据 status_code 快速分流（见 LearningService.fetch_quiz_history）。</p>
     */
    @GetMapping("/results/quiz/{quizId}")
    public ResponseEntity<R<QuizHistoryVo>> getQuizHistory(@PathVariable("quizId") String quizId) {
        QuizHistoryVo vo = learningResultService.queryQuizHistory(quizId);
        if (vo == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(R.fail(HttpStatus.NOT_FOUND.value(), "quiz history not found"));
        }
        return ResponseEntity.ok(R.ok(vo));
    }
}
