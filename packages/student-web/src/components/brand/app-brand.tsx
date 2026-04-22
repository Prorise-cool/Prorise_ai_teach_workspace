/**
 * 文件说明：全站统一的品牌 logo + 文字组件。
 *
 * 之前 learning-center / learning-coach 系列页面各自硬编码 `<Leaf />` 图标 +
 * "XiaoMai" 文字，与顶部导航栏真实 logo（/entry/logo.png + i18n brandLabel）
 * 不一致。本组件抽出，所有页面统一使用。
 *
 * size 仅影响 icon 容器尺寸；文本用 text 属性可覆盖默认 i18n 文案。
 */
import { Link } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { cn } from '@/lib/utils';

type AppBrandSize = 'sm' | 'md' | 'lg';

type AppBrandProps = {
  /** 跳转路径；传 null 不渲染为链接（仅展示）。 */
  to?: string | null;
  /** 容器尺寸档位：sm=28px / md=36px / lg=44px（对应原各页面不同规格）。 */
  size?: AppBrandSize;
  /** 是否在小屏幕隐藏文字（对齐原各页面的 hidden sm:block 行为）。 */
  hideTextOnMobile?: boolean;
  /** 外层 className 覆盖/追加。 */
  className?: string;
  /** 自定义品牌文本；缺省走 i18n entryNav.brand。 */
  text?: string;
};

const CONTAINER_SIZE: Record<AppBrandSize, string> = {
  sm: 'w-7 h-7 rounded-lg',
  md: 'w-9 h-9 rounded-xl',
  lg: 'w-11 h-11 rounded-2xl',
};

const TEXT_SIZE: Record<AppBrandSize, string> = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
};

export function AppBrand({
  to = '/',
  size = 'md',
  hideTextOnMobile = false,
  className,
  text,
}: AppBrandProps) {
  const { t } = useAppTranslation();
  const label = text ?? t('entryNav.brand');

  const content = (
    <>
      <span
        className={cn(
          'bg-surface-light dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark flex items-center justify-center shadow-sm overflow-hidden',
          CONTAINER_SIZE[size],
        )}
      >
        <img
          src="/entry/logo.png"
          alt=""
          className="w-[70%] h-[70%] object-contain"
        />
      </span>
      <span
        className={cn(
          'tracking-tight text-text-primary dark:text-text-primary-dark font-bold',
          TEXT_SIZE[size],
          hideTextOnMobile ? 'hidden sm:block' : null,
        )}
      >
        {label}
      </span>
    </>
  );

  const wrapperClass = cn(
    'flex items-center gap-3 hover:opacity-80 transition-opacity',
    className,
  );

  if (to) {
    return (
      <Link to={to} className={wrapperClass}>
        {content}
      </Link>
    );
  }
  return <div className={wrapperClass}>{content}</div>;
}
