/**
 * 文件说明：输入页共享引导卡片组件。
 * 承接视频输入页与课堂输入页底部三张引导卡片的统一结构。
 */
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/** 单张引导卡片数据。 */
type GuideCardItem = {
  /** 卡片图标。 */
  icon: LucideIcon;
  /** 卡片标题。 */
  title: string;
  /** 卡片描述。 */
  desc: string;
};

/** InputPageGuideCards 属性。 */
type InputPageGuideCardsProps = {
  /** 引导卡片数组。 */
  cards: GuideCardItem[];
  /** 外层容器自定义类名。 */
  className?: string;
};

/**
 * 渲染输入页底部引导卡片网格。
 *
 * @param props - 引导卡片参数。
 * @returns 引导卡片节点。
 */
export function InputPageGuideCards({
  cards,
  className
}: InputPageGuideCardsProps) {
  return (
    <section className={cn('xm-input-guide', className)}>
      {cards.map((card) => (
        <div key={card.title} className="xm-input-guide__card">
          <div className="xm-input-guide__card-icon">
            <card.icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="xm-input-guide__card-title">{card.title}</h3>
            <p className="xm-input-guide__card-desc">{card.desc}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

export type { GuideCardItem };
