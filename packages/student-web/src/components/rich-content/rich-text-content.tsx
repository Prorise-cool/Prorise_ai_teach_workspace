/**
 * 文件说明：跨场景复用的富文本渲染组件。
 *
 * 原实现位于 `features/video/components/video-generating-rich-content.tsx`，
 * Quiz / Checkpoint / Quiz Review 等页面也需要相同的 Markdown + LaTeX 渲染能力
 * （LLM 返回的题干/选项/解析常带 `$...$` 或 `\(...\)`），于是抽到这里并提供两个导出：
 *
 * - `RichBlock`：块级渲染，用 Streamdown 包裹，支持段落/列表等 Markdown 结构。
 *   与旧的 `VideoGeneratingRichContent` 语义完全一致，视频等待页继续复用。
 * - `RichInline`：行内渲染，只做 LaTeX 片段替换并返回 `<span>`，不包 `<p>`/block 标签。
 *   适合 quiz 选项文本这种位于 flex 行内的子元素。
 */
import { useMemo } from 'react';
import { Streamdown } from 'streamdown';
import temml from 'temml';
import 'temml/dist/Temml-Local.css';

import { cn } from '@/lib/utils';

export interface RichBlockProps {
  content: string;
  placeholder: string;
  className?: string;
}

export interface RichInlineProps {
  content: string;
  className?: string;
}

const MATHML_ALLOWED_TAGS: Record<string, string[]> = {
  math: ['display', 'class', 'style'],
  semantics: [],
  annotation: ['encoding'],
  mrow: ['class', 'style'],
  mi: ['class', 'style', 'mathvariant'],
  mn: ['class', 'style'],
  mo: ['class', 'style', 'stretchy', 'form', 'lspace', 'rspace'],
  mfrac: ['class', 'style', 'linethickness'],
  msup: ['class', 'style'],
  msub: ['class', 'style'],
  msubsup: ['class', 'style'],
  msqrt: ['class', 'style'],
  mroot: ['class', 'style'],
  mtext: ['class', 'style'],
  mspace: ['class', 'style', 'width', 'height', 'depth'],
  mtable: ['class', 'style', 'columnalign', 'rowalign', 'columnspacing', 'rowspacing'],
  mtr: ['class', 'style'],
  mtd: ['class', 'style', 'columnspan', 'rowspan'],
  mover: ['class', 'style', 'accent'],
  munder: ['class', 'style', 'accentunder'],
  munderover: ['class', 'style', 'accent', 'accentunder'],
  mstyle: ['class', 'style', 'displaystyle', 'scriptlevel', 'mathsize', 'mathcolor', 'mathbackground'],
  menclose: ['class', 'style', 'notation'],
  mphantom: ['class', 'style'],
  mpadded: ['class', 'style', 'width', 'height', 'depth'],
  mmultiscripts: ['class', 'style'],
  mprescripts: ['class', 'style'],
  mfenced: ['class', 'style', 'open', 'close', 'separators'],
};

const BLOCK_MATH_PATTERN = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\])/g;
const INLINE_MATH_PATTERN = /\\\(([\s\S]+?)\\\)|(?<!\\)\$([^$\n]+?)\$(?!\$)/g;

function stripMathDelimiters(source: string) {
  if (source.startsWith('$$') && source.endsWith('$$')) {
    return source.slice(2, -2).trim();
  }

  if (source.startsWith('\\[') && source.endsWith('\\]')) {
    return source.slice(2, -2).trim();
  }

  if (source.startsWith('\\(') && source.endsWith('\\)')) {
    return source.slice(2, -2).trim();
  }

  if (source.startsWith('$') && source.endsWith('$')) {
    return source.slice(1, -1).trim();
  }

  return source.trim();
}

function renderMathMarkup(source: string, displayMode: boolean) {
  const expression = stripMathDelimiters(source);

  if (!expression) {
    return source;
  }

  try {
    return temml
      .renderToString(expression, {
        displayMode,
        throwOnError: false,
      })
      .replace(/\sstyle="[^"]*"/g, '');
  } catch {
    return source;
  }
}

function injectMathMarkup(content: string) {
  const withBlockMath = content.replace(BLOCK_MATH_PATTERN, (match) => {
    return `\n${renderMathMarkup(match, true)}\n`;
  });

  return withBlockMath.replace(INLINE_MATH_PATTERN, (match, bracketExpression, dollarExpression) => {
    return renderMathMarkup(bracketExpression ?? dollarExpression ?? match, false);
  });
}

function toInlineMathMarkup(content: string) {
  return content.replace(INLINE_MATH_PATTERN, (match, bracketExpression, dollarExpression) => {
    const expression = (bracketExpression ?? dollarExpression ?? '').trim();
    if (!expression) {
      return match;
    }
    try {
      return temml.renderToString(expression, {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return match;
    }
  });
}

/**
 * 块级渲染：走 Streamdown，支持完整 Markdown + LaTeX。
 */
export function RichBlock({ content, placeholder, className }: RichBlockProps) {
  const normalizedContent = content.trim();
  const renderedContent = useMemo(
    () => injectMathMarkup(normalizedContent),
    [normalizedContent],
  );

  if (!normalizedContent) {
    if (!placeholder) {
      return null;
    }
    return (
      <p className={cn('xm-generating-rich-content__placeholder', className)}>
        {placeholder}
      </p>
    );
  }

  return (
    <div className={cn('xm-generating-rich-content', className)}>
      <Streamdown
        mode="static"
        allowedTags={MATHML_ALLOWED_TAGS}
        className="xm-generating-rich-content__markdown"
      >
        {renderedContent}
      </Streamdown>
    </div>
  );
}

/**
 * 行内渲染：只做 LaTeX 片段替换并返回 `<span>`。
 *
 * 适合 quiz 选项文本这类行内子元素：不包 `<p>`，不走 Streamdown，
 * 保留外层 className（字体/字号）不被破坏。
 */
export function RichInline({ content, className }: RichInlineProps) {
  const html = useMemo(() => toInlineMathMarkup(content ?? ''), [content]);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
