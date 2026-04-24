/**
 * summarize-elements 单测 —— 6 种场景覆盖：text / image / shape / latex
 * / empty / HTML 剥离与截断。
 */
import { describe, expect, it } from 'vitest';

import type { SlideElement } from '../types/scene';

import { summarizeElements } from './summarize-elements';

function text(over: Partial<SlideElement>): SlideElement {
  return {
    id: 't1',
    type: 'text',
    left: 100,
    top: 60,
    width: 400,
    height: 80,
    content: '<p>Hello</p>',
    ...over,
  } as SlideElement;
}

describe('summarizeElements', () => {
  it('returns "(empty)" for empty input', () => {
    expect(summarizeElements([])).toBe('  (empty)');
    expect(summarizeElements(undefined)).toBe('  (empty)');
    expect(summarizeElements(null)).toBe('  (empty)');
  });

  it('summarizes a text element with id / position / size and strips HTML', () => {
    const out = summarizeElements([text({})]);
    expect(out).toBe('  1. [id:t1] text: "Hello" at (100,60) size 400×80');
  });

  it('truncates overlong text content', () => {
    const long = 'a'.repeat(200);
    const out = summarizeElements([text({ id: 't2', content: long })]);
    expect(out).toContain('[id:t2]');
    expect(out).toContain('...');
    // 80-char preview present, not full 200
    expect(out).toContain('a'.repeat(80));
    expect(out).not.toContain('a'.repeat(200));
  });

  it('summarizes latex with raw source', () => {
    const el: SlideElement = {
      id: 'l1',
      type: 'latex',
      left: 300,
      top: 240,
      width: 360,
      height: 120,
      content: '\\int_a^b f(x)\\,dx',
    };
    const out = summarizeElements([el]);
    expect(out).toContain('[id:l1] latex: "\\int_a^b f(x)\\,dx"');
    expect(out).toContain('at (300,240) size 360×120');
  });

  it('summarizes image and flags embedded base64 src', () => {
    const normal: SlideElement = {
      id: 'i1',
      type: 'image',
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      content: null,
      extra: { src: 'https://cdn.example.com/a.png' },
    };
    const embedded: SlideElement = {
      id: 'i2',
      type: 'image',
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      content: null,
      extra: { src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCA==' },
    };
    const out = summarizeElements([normal, embedded]);
    expect(out).toContain('https://cdn.example.com/a.png');
    expect(out).toContain('[embedded]');
    // embedded src should NOT be inlined
    expect(out).not.toContain('iVBORw0KG');
  });

  it('summarizes shape with optional fill', () => {
    const shape: SlideElement = {
      id: 's1',
      type: 'shape',
      left: 10,
      top: 20,
      width: 300,
      height: 60,
      content: null,
      extra: { fill: '#eee' },
    };
    const out = summarizeElements([shape]);
    expect(out).toContain('[id:s1] shape fill=#eee');
    expect(out).toContain('at (10,20) size 300×60');
  });

  it('indexes multiple elements starting from 1', () => {
    const out = summarizeElements([
      text({ id: 't1', content: 'A' }),
      text({ id: 't2', content: 'B' }),
      text({ id: 't3', content: 'C' }),
    ]);
    const lines = out.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(/^ {2}1\./);
    expect(lines[1]).toMatch(/^ {2}2\./);
    expect(lines[2]).toMatch(/^ {2}3\./);
  });
});
