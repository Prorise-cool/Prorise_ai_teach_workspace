/**
 * 幻灯片元素类型（精简版）。
 * 完整类型参见 OpenMAIC lib/types/slides.ts。
 */

export type SlideElementType = 'text' | 'image' | 'shape' | 'line' | 'chart' | 'latex' | 'code';

interface BaseElement {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  rotate: number;
  lock?: boolean;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  defaultFontName: string;
  defaultColor: string;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  fixedRatio: boolean;
}

export interface LatexElement extends BaseElement {
  type: 'latex';
  latex: string;
  html?: string;
  color?: string;
}

export type SlideElement = TextElement | ImageElement | LatexElement;

export interface SlideBackground {
  type: 'solid' | 'image' | 'gradient';
  color?: string;
}

export interface SlideTheme {
  backgroundColor: string;
  themeColors: string[];
  fontColor: string;
  fontName: string;
}

export interface SlideData {
  id: string;
  viewportSize: number;
  viewportRatio: number;
  theme: SlideTheme;
  elements: SlideElement[];
  background?: SlideBackground;
}
