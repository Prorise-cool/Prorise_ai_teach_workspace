/**
 * 画布元素摘要 —— Phase 4 chat 上下文的"画布"部分。
 *
 * 从 OpenMAIC `lib/orchestration/summarizers/state-context.ts` 端口，
 * 但按我们 `types/scene.ts` 真实字段对齐：我们 SlideElement 的类型只有
 * `text | shape | image | latex`，content 是 string | null（HTML 或 LaTeX
 * 源码），无 chart / table / line / code / video / audio。
 *
 * 输出示例：
 * ```
 *   1. [id:e1] text: "微积分基本定理" at (180,60) size 600×80
 *   2. [id:e2] latex: "$\int_a^b f(x)\,dx$" at (300,240) size 360×120
 * ```
 *
 * 关键不变量：每行第一个 token 是 `[id:xxx]`，让 LLM 能从摘要里直接读到
 * 元素 id 并在回复中用 `[elem:xxx]` 指代。
 */
import type { SlideElement } from '../types/scene';

/** 从一段 HTML 片段里抽纯文本（课件 text 元素的 content 是富文本 HTML）。 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/** 单行摘要。不关心 i18n，这是喂给 LLM 的，保持稳定格式。 */
function summarizeElement(el: SlideElement): string {
  const idTag = el.id ? `[id:${el.id}]` : '[id:?]';
  const pos = `at (${Math.round(el.left ?? 0)},${Math.round(el.top ?? 0)})`;
  const size =
    el.width != null && el.height != null
      ? ` size ${Math.round(el.width)}×${Math.round(el.height)}`
      : '';

  switch (el.type) {
    case 'text': {
      const raw = stripHtml(el.content ?? '');
      const preview = raw.slice(0, 80);
      const suffix = raw.length > 80 ? '...' : '';
      return `${idTag} text: "${preview}${suffix}" ${pos}${size}`;
    }
    case 'latex': {
      const src = (el.content ?? (el.extra?.latex as string | undefined) ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80);
      return `${idTag} latex: "${src}" ${pos}${size}`;
    }
    case 'image': {
      const src =
        (el.extra?.src as string | undefined) ??
        el.content ??
        '';
      const previewSrc = src.startsWith('data:')
        ? '[embedded]'
        : src.slice(0, 60) || 'unknown';
      return `${idTag} image: ${previewSrc} ${pos}${size}`;
    }
    case 'shape': {
      const fill = (el.extra?.fill as string | undefined) ?? '';
      const note = fill ? ` fill=${fill}` : '';
      return `${idTag} shape${note} ${pos}${size}`;
    }
    default: {
      // exhaustive guard：若未来 SlideElement.type 新增，此处 TS 会报错。
      const _exhaustive: never = el.type;
      void _exhaustive;
      return `${idTag} unknown ${pos}${size}`;
    }
  }
}

/**
 * 把元素列表拼成多行摘要。空数组返回 `"  (empty)"`（与 OpenMAIC 行为一致）。
 */
export function summarizeElements(
  elements: readonly SlideElement[] | undefined | null,
): string {
  if (!elements || elements.length === 0) return '  (empty)';
  return elements
    .map((el, i) => `  ${i + 1}. ${summarizeElement(el)}`)
    .join('\n');
}
