'use client';

import { forwardRef, useState } from 'react';
import { Icon } from './icons';
import { Badge as ShadcnBadge } from './ui/badge';
import { Button as ShadcnButton, type ButtonProps as ShadcnButtonProps } from './ui/button';

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <span className={`group inline-flex items-center gap-2.5 font-semibold tracking-[-.03em] ${dark ? 'text-white' : 'text-ink'}`}>
      <span className="grid h-8 w-8 place-items-center rounded-[11px] bg-gradient-to-br from-coral via-coral to-[#8D76E8] text-white shadow-[0_8px_22px_rgba(255,107,97,.3)] transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105">
        <Icon name="link" size={17} stroke={2.2} />
      </span>
      <span className="text-[17px]">
        linkforge<span className={dark ? 'text-coral' : 'text-coral-600'}>.</span>
      </span>
    </span>
  );
}

type LegacyButtonProps = Omit<ShadcnButtonProps, 'variant'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark';
};

export const Button = forwardRef<HTMLButtonElement, LegacyButtonProps>(({ variant = 'primary', ...props }, ref) => {
  const variants = { primary: 'default', secondary: 'outline', ghost: 'ghost', dark: 'dark' } as const;
  return <ShadcnButton ref={ref} variant={variants[variant]} {...props} />;
});
Button.displayName = 'Button';

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'green' | 'orange' | 'purple' | 'blue';
}) {
  const variants = { neutral: 'secondary', green: 'success', orange: 'warning', purple: 'purple', blue: 'info' } as const;
  return (
    <ShadcnBadge variant={variants[tone]}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${tone === 'green' ? 'bg-[#47B77A]' : tone === 'orange' ? 'bg-[#F5A543]' : tone === 'purple' ? 'bg-[#8975E8]' : tone === 'blue' ? 'bg-[#55A7C2]' : 'bg-ink/30'}`}
      />
      {children}
    </ShadcnBadge>
  );
}

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <ShadcnButton
      aria-label="Copy link"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-ink/35 hover:text-ink"
      onClick={async () => {
        await navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      <Icon name={copied ? 'check' : 'copy'} size={16} stroke={copied ? 2.2 : 1.8} />
    </ShadcnButton>
  );
}

export function SectionLabel({ eyebrow, title, detail }: { eyebrow: string; title: string; detail?: string }) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-coral-600">{eyebrow}</p>
      <h2 className="gradient-text text-2xl font-semibold tracking-[-.04em] md:text-3xl">{title}</h2>
      {detail && <p className="mt-2 max-w-xl text-sm leading-6 text-ink/50">{detail}</p>}
    </div>
  );
}
