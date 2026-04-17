/**
 * 文件说明：视频等待页富文本渲染组件。
 * 负责把摘要/讲解文本中的 Markdown 与常见公式分隔符转成可直接阅读的内容。
 */
import { useMemo } from 'react';
import { Streamdown } from 'streamdown';
import temml from 'temml';
import 'temml/dist/Temml-Local.css';

import { cn } from '@/lib/utils';

export interface VideoGeneratingRichContentProps {
  content: string;
  placeholder: string;
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

/**
 * 渲染等待页中可流式更新的富文本内容。
 *
 * @param props - 富文本内容与占位文案。
 * @returns 带 Markdown / MathML 的内容块。
 */
export function VideoGeneratingRichContent({
  content,
  placeholder,
  className,
}: VideoGeneratingRichContentProps) {
  const normalizedContent = content.trim();
  const renderedContent = useMemo(
    () => injectMathMarkup(normalizedContent),
    [normalizedContent],
  );

  if (!normalizedContent) {
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
