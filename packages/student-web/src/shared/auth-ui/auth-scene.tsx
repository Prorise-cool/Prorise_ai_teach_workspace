/**
 * 文件说明：认证页左侧插画场景组件。
 * 负责根据表单焦点和空闲状态切换视觉表情与注视方向。
 */
import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';
import { useAuthPageCopy } from './auth-content';

export type AuthInteractionZone = 'account' | 'sensitive' | null;

export type AuthScenePhase =
  | 'idle'
  | 'peeking'
  | 'hidden'
  | 'sleep'
  | 'wake-up';

const SCENE_PHASE_CLASS_NAME: Record<AuthScenePhase, string> = {
  idle: '',
  peeking: 'is-peeking',
  hidden: 'is-hidden',
  sleep: 'is-sleeping',
  'wake-up': 'is-waking'
};

const AUTH_SCENE_CHARACTERS = ['1', '2', '3', '4'] as const;

type AuthSceneProps = {
  phase: AuthScenePhase;
};

/**
 * 把插画眼球位置重置为默认中心点。
 *
 * @param sceneElement - 场景容器节点。
 */
function resetPupils(sceneElement: HTMLDivElement | null) {
  if (!sceneElement) {
    return;
  }

  sceneElement.querySelectorAll<HTMLElement>('.xm-auth-pupil').forEach(pupil => {
    pupil.style.transform = 'translate(-50%, -50%)';
  });
}

/**
 * 渲染认证页左侧插画场景，并根据阶段切换表情与注视效果。
 *
 * @param props - 插画场景参数。
 * @param props.phase - 当前插画阶段。
 * @returns 插画场景节点。
 */
export function AuthScene({ phase }: AuthSceneProps) {
  const authPageCopy = useAuthPageCopy();
  const sceneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sceneElement = sceneRef.current;

    if (!sceneElement) {
      return undefined;
    }

    if (phase === 'hidden' || phase === 'sleep') {
      resetPupils(sceneElement);
    }

    const handlePointerMove = (event: MouseEvent) => {
      if (phase === 'hidden' || phase === 'sleep') {
        return;
      }

      sceneElement.querySelectorAll<HTMLElement>('.xm-auth-eye').forEach(eye => {
        const rect = eye.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = event.clientX - centerX;
        const deltaY = event.clientY - centerY;
        const angle = Math.atan2(deltaY, deltaX);
        const maxDistance = eye.clientWidth / 2 - 4;
        const distance = Math.min(
          Math.hypot(deltaX, deltaY) / 30,
          maxDistance
        );
        const pupil = eye.querySelector<HTMLElement>('.xm-auth-pupil');

        if (!pupil) {
          return;
        }

        const translateX = Math.cos(angle) * distance;
        const translateY = Math.sin(angle) * distance;
        pupil.style.transform = `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px))`;
      });
    };

    window.addEventListener('mousemove', handlePointerMove);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
    };
  }, [phase]);

  useEffect(() => {
    const sceneElement = sceneRef.current;

    return () => {
      resetPupils(sceneElement);
    };
  }, []);

  return (
    <section className="xm-auth-left-panel" aria-hidden="true">
      <div className="xm-auth-glow" />
      <div
        ref={sceneRef}
        className={cn(
          'xm-auth-characters',
          SCENE_PHASE_CLASS_NAME[phase]
        )}
      >
        {AUTH_SCENE_CHARACTERS.map(characterId => (
          <div
            key={characterId}
            className={cn(
              'xm-auth-character',
              `xm-auth-char-${characterId}`
            )}
          >
            <div className="xm-auth-eyes">
              <div className="xm-auth-eye">
                <div className="xm-auth-pupil" />
              </div>
              <div className="xm-auth-eye">
                <div className="xm-auth-pupil" />
              </div>
            </div>
            <div className="xm-auth-mouth" />
          </div>
        ))}
      </div>
      <div className="xm-auth-hero-text">
        <h2>
          {authPageCopy.heroTitle[0]}
          <br />
          {authPageCopy.heroTitle[1]}
        </h2>
      </div>
    </section>
  );
}
