/**
 * 智能体头像 —— 1:1 移植自 OpenMAIC 头像规格。
 *
 * 视觉要点：
 *   - 圆形，背景 agent.color（inline 注入）
 *   - 文字默认名字首字母，白色 bold
 *   - 尺寸：sm / md / lg
 *   - 可选图片头像（保留现有行为）
 *   - 可选在线小圆点（保留现有行为）
 */
import { useState, type FC } from 'react';

interface AgentAvatarProps {
  name: string;
  color: string;
  avatar?: string;
  size?: 'sm' | 'md' | 'lg';
  showOnlineIndicator?: boolean;
}

const SIZE_CLASS = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
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
  const [imgBroken, setImgBroken] = useState(false);
  // avatar 可能传入空字符串或加载失败 URL —— 都降级到首字母
  const showImage = !!avatar && !imgBroken;

  return (
    <div className="relative shrink-0">
      {showImage ? (
        <img
          src={avatar}
          alt={name}
          onError={() => setImgBroken(true)}
          className={`${SIZE_CLASS[size]} rounded-full border-2 border-white object-cover shadow-sm`}
          style={{ borderColor: `${color}40` }}
        />
      ) : (
        <div
          className={`${SIZE_CLASS[size]} flex items-center justify-center rounded-full font-bold uppercase text-white shadow-sm shrink-0`}
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
