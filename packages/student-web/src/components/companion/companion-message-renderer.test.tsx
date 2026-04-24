/**
 * CompanionMessageRenderer 单测。
 *
 * 覆盖 3 种元素引用格式解析 + 点击回调 + 纯文本透传。
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  CompanionMessageRenderer,
  parseCompanionMessage,
} from './companion-message-renderer';

describe('parseCompanionMessage', () => {
  it('returns pure text segment when no references', () => {
    expect(parseCompanionMessage('hello world')).toEqual([
      { kind: 'text', text: 'hello world' },
    ]);
  });

  it('parses [elem:xxx] explicit syntax', () => {
    const out = parseCompanionMessage('看 [elem:abc-1] 这里');
    expect(out).toEqual([
      { kind: 'text', text: '看 ' },
      { kind: 'pill', elementId: 'abc-1' },
      { kind: 'text', text: ' 这里' },
    ]);
  });

  it('parses #xxx hashtag syntax (word boundary)', () => {
    const out = parseCompanionMessage('注意 #e1 这个图');
    expect(out).toEqual([
      { kind: 'text', text: '注意 ' },
      { kind: 'pill', elementId: 'e1' },
      { kind: 'text', text: ' 这个图' },
    ]);
  });

  it('parses id:xxx syntax', () => {
    const out = parseCompanionMessage('id:elem_42 是目标');
    expect(out[0]).toEqual({ kind: 'pill', elementId: 'elem_42' });
  });

  it('parses multiple mixed references in one message', () => {
    const out = parseCompanionMessage('先 [elem:a] 然后 #b 最后 id:c 结束');
    const pills = out.filter((s) => s.kind === 'pill');
    expect(pills.map((p) => (p as { elementId: string }).elementId)).toEqual(['a', 'b', 'c']);
  });

  it('returns empty array for empty string', () => {
    expect(parseCompanionMessage('')).toEqual([]);
  });
});

describe('<CompanionMessageRenderer />', () => {
  it('renders plain text when no references', () => {
    render(<CompanionMessageRenderer content="hello" />);
    expect(screen.getByText('hello')).toBeDefined();
  });

  it('renders pill buttons and fires onElementReference on click', async () => {
    const onRef = vi.fn();
    render(
      <CompanionMessageRenderer
        content="看 [elem:target-1] 这里"
        onElementReference={onRef}
      />,
    );
    const pill = screen.getByRole('button', { name: /target-1/i });
    await userEvent.click(pill);
    expect(onRef).toHaveBeenCalledWith('target-1');
  });

  it('renders pill as disabled when onElementReference is missing', () => {
    render(<CompanionMessageRenderer content="看 [elem:x]" />);
    const pill = screen.getByRole('button', { name: /x/i });
    expect((pill as HTMLButtonElement).disabled).toBe(true);
  });
});
