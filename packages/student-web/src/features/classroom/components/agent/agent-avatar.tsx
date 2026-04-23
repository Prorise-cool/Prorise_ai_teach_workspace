/**
 * 智能体头像组件。
 * 展示智能体标识色圆圈，支持 fallback 文字 avatar。
 */
import type { FC } from 'react';

interface AgentAvatarProps {
  name: string;
  color: string;
  avatar?: string;
  size?: 'sm' | 'md' | 'lg';
  showOnlineIndicator?: boolean;
}

const SIZE_CLASS = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-10 h-10 text-sm',
} as const;

const INDICATOR_SIZE = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
} as const;

export const AgentAvatar: FC<AgentAvatarProps> = ({
  name,
  color,
  avatar,
  size = 'md',
  showOnlineIndicator = false,
}) => {
  const initials = name.slice(0, 2);

  return (
    <div className="relative shrink-0">
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          className={`${SIZE_CLASS[size]} rounded-full border-2 border-white object-cover shadow-sm`}
          style={{ borderColor: `${color}40` }}
        />
      ) : (
        <div
          className={`${SIZE_CLASS[size]} flex items-center justify-center rounded-full font-bold text-white shadow-sm`}
          style={{ backgroundColor: color }}
          title={name}
        >
          {initials}
        </div>
      )}
      {showOnlineIndicator && (
        <span
          className={`${INDICATOR_SIZE[size]} absolute bottom-0 right-0 rounded-full bg-green-500 ring-1 ring-white`}
        />
      )}
    </div>
  );
};
