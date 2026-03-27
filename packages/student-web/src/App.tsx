import { env } from '@/lib/env'

function App() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-16">
      <section className="w-full rounded-[28px] border border-border bg-card p-8 shadow-[0_20px_60px_-30px_rgba(25,36,53,0.18)]">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Student Web Shell
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {env.VITE_APP_TITLE}
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            当前仅保留工程骨架与开发配置，业务页面、业务组件和示例交互暂不在这里预置。
          </p>
        </div>
      </section>
    </main>
  )
}

export default App
