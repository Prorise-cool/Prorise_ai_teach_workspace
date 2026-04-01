/**
 * 文件说明：独立营销落地页，服务获客、试点和合作转化，不替代默认首页。
 */
import { ArrowRight, BookOpenText, GraduationCap, MessageSquareQuote, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import { buildLoginHref } from '@/features/auth/use-auth-redirect';
import {
  CLASSROOM_INPUT_ROUTE,
  HOME_ROUTE
} from '@/features/navigation/route-paths';

const teacherStyles = [
  ['严肃型', '适合考前冲刺与正式推导', 'agent-accent-serious'],
  ['幽默型', '适合入门与提起兴趣', 'agent-accent-humorous'],
  ['耐心型', '适合难点攻克与慢节奏讲解', 'agent-accent-patient'],
  ['高效型', '适合碎片复习与快速定位重点', 'agent-accent-efficient']
] as const;

const faqItems = [
  [
    '小麦和普通搜题产品有什么区别？',
    '它不是只返回答案，而是把知识点组织成动画讲解、继续追问和后续练习的一整条学习链路。'
  ],
  [
    '营销页会替代默认首页吗？',
    '不会。默认进入产品仍然是 /，/landing 只用于投放、宣传和试点招募场景。'
  ],
  [
    '教师 / 院校 CTA 会直接跳到管理后台吗？',
    '不会。当前只承接咨询、试点或合作申请，不伪造尚未上线的 ToB 工作台。'
  ]
] as const;

export function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[460px] bg-[radial-gradient(circle_at_top,_rgba(245,197,71,0.24),_transparent_58%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,23,1,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(59,23,1,0.04)_1px,transparent_1px)] bg-[size:32px_32px] opacity-50 dark:bg-[linear-gradient(rgba(245,237,225,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(245,237,225,0.03)_1px,transparent_1px)]" />

      <div className="relative mx-auto w-full max-w-7xl px-6 py-8">
        <header className="flex items-center justify-between rounded-full border border-border bg-white/72 px-5 py-3 shadow-sm backdrop-blur dark:bg-[rgba(31,26,24,0.72)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
              XM
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                XiaoMai
              </div>
              <div className="text-base font-semibold text-foreground">
                营销落地页
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              className="rounded-full border border-border bg-background/70 px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/60 hover:text-primary"
              to={HOME_ROUTE}
            >
              返回产品首页
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-105"
              to={buildLoginHref(CLASSROOM_INPUT_ROUTE)}
            >
              立即体验
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <section className="grid gap-8 py-14 lg:grid-cols-[minmax(0,1.1fr)_420px] lg:py-18">
          <div className="space-y-7">
            <span className="xm-floating-pill inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4" />
              AIGC 原生虚拟教室
            </span>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-foreground md:text-6xl">
                把“想学什么”或“这道题不会”直接变成一堂会动的课
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
                小麦服务的是产品认知、试点沟通与合作转化。这里讲清品牌价值、双入口能力和老师风格亮点；真正进入产品，仍然去默认首页或登录页继续。
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="xm-surface-card rounded-[var(--xm-radius-xl)] p-5">
                <div className="text-sm font-semibold tracking-[0.22em] uppercase text-muted-foreground">
                  入口 1
                </div>
                <div className="mt-3 text-2xl font-semibold text-foreground">
                  我想系统学一个主题
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  更像完整课堂，适合课程目标、知识框架和多步推演。
                </p>
              </div>
              <div className="xm-surface-card rounded-[var(--xm-radius-xl)] p-5">
                <div className="text-sm font-semibold tracking-[0.22em] uppercase text-muted-foreground">
                  入口 2
                </div>
                <div className="mt-3 text-2xl font-semibold text-foreground">
                  帮我讲清一道题
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  更像单点突破，适合截图、OCR 识题和考前碎片复习。
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-105"
                to={HOME_ROUTE}
              >
                先进入产品首页
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:text-primary"
                to={buildLoginHref(CLASSROOM_INPUT_ROUTE)}
              >
                直接去课堂体验
              </Link>
            </div>
          </div>

          <aside className="space-y-4">
            <section className="xm-surface-card rounded-[var(--xm-radius-xl)] p-6">
              <div className="text-sm font-semibold tracking-[0.22em] uppercase text-muted-foreground">
                老师风格亮点
              </div>
              <div className="mt-4 grid gap-3">
                {teacherStyles.map(([title, description, accentClassName]) => (
                  <div
                    className={`rounded-[var(--xm-radius-lg)] border border-border bg-background/70 p-4 ${accentClassName}`}
                    key={title}
                  >
                    <div className="text-base font-semibold text-foreground">{title}</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[var(--xm-radius-xl)] border border-border bg-card/90 p-6 shadow-sm">
              <div className="text-sm font-semibold tracking-[0.22em] uppercase text-muted-foreground">
                试点 / 合作 CTA
              </div>
              <div className="mt-4 grid gap-3">
                <a
                  className="inline-flex items-center justify-between rounded-[var(--xm-radius-lg)] border border-border bg-background/70 px-4 py-4 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:text-primary"
                  href="mailto:3381292732@qq.com?subject=%E5%B0%8F%E9%BA%A6%E6%95%99%E5%B8%88%E8%AF%95%E7%82%B9"
                >
                  教师试点咨询
                  <GraduationCap className="h-4 w-4" />
                </a>
                <a
                  className="inline-flex items-center justify-between rounded-[var(--xm-radius-lg)] border border-border bg-background/70 px-4 py-4 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:text-primary"
                  href="mailto:3381292732@qq.com?subject=%E5%B0%8F%E9%BA%A6%E9%99%A2%E6%A0%A1%E5%90%88%E4%BD%9C"
                >
                  院校合作申请
                  <BookOpenText className="h-4 w-4" />
                </a>
                <a
                  className="inline-flex items-center justify-between rounded-[var(--xm-radius-lg)] border border-border bg-background/70 px-4 py-4 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:text-primary"
                  href="mailto:3381292732@qq.com?subject=%E5%B0%8F%E9%BA%A6%E4%BA%A7%E5%93%81%E5%8F%8D%E9%A6%88"
                >
                  产品反馈与预约演示
                  <MessageSquareQuote className="h-4 w-4" />
                </a>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                当前阶段若尚未接入正式线索系统，统一通过静态咨询与邮件预约承接，不伪造后台自助开通流程。
              </p>
            </section>
          </aside>
        </section>

        <section className="grid gap-6 py-10 md:grid-cols-3">
          {faqItems.map(([question, answer]) => (
            <article
              className="rounded-[var(--xm-radius-xl)] border border-border bg-card/85 p-5 shadow-sm"
              key={question}
            >
              <h2 className="text-lg font-semibold text-foreground">{question}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{answer}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
