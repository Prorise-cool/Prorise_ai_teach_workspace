export function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-16">
      <section className="xm-surface-card w-full rounded-[var(--xm-radius-xl)] p-10">
        <div className="space-y-4">
          <span className="xm-floating-pill inline-flex px-3 py-1 text-sm font-medium">
            Student Web Scaffold
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            小麦学生端模板已就绪
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            当前已补齐工程骨架、样式令牌、主题变量与依赖配置。业务页面、组件和接口适配层将在后续
            Epic 中继续向上搭建。
          </p>
        </div>
      </section>
    </main>
  );
}
