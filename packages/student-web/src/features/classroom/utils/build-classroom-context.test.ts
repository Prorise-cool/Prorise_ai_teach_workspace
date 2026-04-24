/**
 * build-classroom-context 单测。
 *
 * 覆盖：
 *   - scene 为 null → 空 payload
 *   - slide scene → sceneId/Title/Body/keyPoints/canvasSummary 齐备
 *   - recent speech 只拿 speech action 类型，截断到 3 条
 *   - interactive / pbl 场景 → 无 canvasSummary / sceneBody
 */
import { describe, expect, it } from 'vitest';

import type { Classroom } from '../types/classroom';
import type { Scene } from '../types/scene';

import { buildClassroomContext } from './build-classroom-context';

function makeSlideScene(over: Partial<Scene> = {}): Scene {
  return {
    id: 'scene-1',
    title: '微积分基本定理',
    type: 'slide',
    content: {
      background: { color: '#fff' },
      elements: [
        {
          id: 'e1',
          type: 'text',
          left: 100,
          top: 60,
          width: 400,
          height: 80,
          content: '<p>牛顿-莱布尼茨公式</p>',
        },
        {
          id: 'e2',
          type: 'latex',
          left: 300,
          top: 240,
          width: 360,
          height: 120,
          content: '\\int_a^b f(x)\\,dx',
        },
      ],
    },
    outline: {
      id: 'scene-1',
      type: 'slide',
      order: 1,
      title: '微积分基本定理',
      keyPoints: ['不定积分', '定积分', ''],
    },
    actions: [
      { id: 'a1', type: 'speech', text: '今天我们讲牛顿-莱布尼茨公式。' },
      { id: 'a2', type: 'laser', elementId: 'e2' },
      { id: 'a3', type: 'speech', text: '这个公式连接了积分和原函数。' },
      { id: 'a4', type: 'speech', text: '下面一起推导。' },
    ],
    ...over,
  } as Scene;
}

const EMPTY_CLASSROOM = null as Classroom | null;

describe('buildClassroomContext', () => {
  it('returns empty payload when scene is null', () => {
    expect(buildClassroomContext({ classroom: EMPTY_CLASSROOM, scene: null })).toEqual({});
  });

  it('extracts sceneId / sceneTitle from slide scene', () => {
    const out = buildClassroomContext({
      classroom: EMPTY_CLASSROOM,
      scene: makeSlideScene(),
    });
    expect(out.sceneId).toBe('scene-1');
    expect(out.sceneTitle).toBe('微积分基本定理');
  });

  it('joins slide text elements into sceneBody with HTML stripped + latex annotated', () => {
    const out = buildClassroomContext({
      classroom: EMPTY_CLASSROOM,
      scene: makeSlideScene(),
    });
    expect(out.sceneBody).toContain('牛顿-莱布尼茨公式');
    expect(out.sceneBody).toContain('[公式]');
    expect(out.sceneBody).toContain('\\int_a^b f(x)');
    // HTML tags stripped
    expect(out.sceneBody).not.toMatch(/<p>/);
  });

  it('filters empty strings from keyPoints', () => {
    const out = buildClassroomContext({
      classroom: EMPTY_CLASSROOM,
      scene: makeSlideScene(),
    });
    expect(out.keyPoints).toEqual(['不定积分', '定积分']);
  });

  it('builds recentSpeech from last 3 speech actions only (skips laser)', () => {
    const out = buildClassroomContext({
      classroom: EMPTY_CLASSROOM,
      scene: makeSlideScene(),
    });
    expect(out.recentSpeech).toContain('今天我们讲');
    expect(out.recentSpeech).toContain('下面一起推导');
    // laser action should not appear
    expect(out.recentSpeech).not.toContain('elementId');
  });

  it('canvasSummary contains element id tokens for LLM to reference', () => {
    const out = buildClassroomContext({
      classroom: EMPTY_CLASSROOM,
      scene: makeSlideScene(),
    });
    expect(out.canvasSummary).toContain('[id:e1]');
    expect(out.canvasSummary).toContain('[id:e2]');
  });

  it('returns bare scene id/title for interactive scene (no body / canvas)', () => {
    const scene: Scene = {
      id: 'scene-2',
      title: '交互页面',
      type: 'interactive',
      content: { html: '<div/>' },
    } as Scene;
    const out = buildClassroomContext({ classroom: EMPTY_CLASSROOM, scene });
    expect(out.sceneId).toBe('scene-2');
    expect(out.sceneTitle).toBe('交互页面');
    expect(out.sceneBody).toBeUndefined();
    expect(out.canvasSummary).toBeUndefined();
  });
});
