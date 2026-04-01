/**
 * 文件说明：首页双入口卡片。
 */
import { ArrowRight, Lock, ShieldBan } from 'lucide-react';
import { Link } from 'react-router-dom';

import { buildLoginHref } from '@/features/auth/use-auth-redirect';
import type { HomeEntryDescriptor } from '@/features/navigation/entry-visibility';
import { cn } from '@/lib/utils';

type EntryCardProps = {
  descriptor: HomeEntryDescriptor;
};

function buildAction(descriptor: HomeEntryDescriptor) {
  if (descriptor.actionState === 'login-required') {
    return {
      href: buildLoginHref(descriptor.route),
      icon: <Lock className="h-4 w-4" />,
      disabled: false
    };
  }

  if (descriptor.actionState === 'disabled') {
    return {
      href: '',
      icon: <ShieldBan className="h-4 w-4" />,
      disabled: true
    };
  }

  return {
    href: descriptor.route,
    icon: <ArrowRight className="h-4 w-4" />,
    disabled: false
  };
}

export function EntryCard({ descriptor }: EntryCardProps) {
  const action = buildAction(descriptor);

  return (
    <article
      className={cn(
        'xm-surface-card flex h-full flex-col justify-between rounded-[var(--xm-radius-xl)] p-6',
        descriptor.accentClassName
      )}
    >
      <div className="space-y-5">
        <div className="space-y-3">
          <span className="xm-floating-pill inline-flex px-3 py-1 text-xs font-semibold tracking-[0.22em] uppercase">
            {descriptor.eyebrow}
          </span>
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              {descriptor.title}
            </h2>
            <p className="text-base leading-7 text-muted-foreground">
              {descriptor.description}
            </p>
          </div>
        </div>

        <div className="rounded-[var(--xm-radius-lg)] border border-[color:var(--xm-color-agent-accent-border)] bg-[color:var(--xm-color-agent-accent-soft)] px-4 py-3 text-sm leading-6 text-foreground">
          {descriptor.summary}
        </div>
      </div>

      <div className="mt-8">
        {action.disabled ? (
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background/80 px-5 py-3 text-sm font-semibold text-muted-foreground"
            disabled
            type="button"
          >
            {action.icon}
            {descriptor.ctaLabel}
          </button>
        ) : (
          <Link
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-105"
            to={action.href}
          >
            {action.icon}
            {descriptor.ctaLabel}
          </Link>
        )}
      </div>
    </article>
  );
}
