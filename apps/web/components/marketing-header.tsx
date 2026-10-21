'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from './icons';
import { Button, Logo } from './ui';

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
      <Logo />
      <nav className="hidden items-center gap-7 text-sm text-ink/55 md:flex">
        <a href="#why" className="transition hover:text-ink">
          Why LinkForge
        </a>
        <a href="#workflow" className="transition hover:text-ink">
          How it works
        </a>
        <a href="#analytics" className="transition hover:text-ink">
          Analytics
        </a>
      </nav>
      <div className="hidden items-center gap-2 md:flex">
        <Link
          href="/login"
          className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink/60 transition hover:bg-ink/[.04] hover:text-ink"
        >
          Sign in
        </Link>
        <Link href="/dashboard">
          <Button>
            Open dashboard <Icon name="arrow" size={15} />
          </Button>
        </Link>
      </div>
      <button className="rounded-xl p-2 text-ink md:hidden" onClick={() => setOpen(!open)} aria-label="Open menu">
        <Icon name={open ? 'x' : 'menu'} />
      </button>
      {open && (
        <div className="absolute left-5 right-5 top-[70px] rounded-2xl border border-ink/10 bg-white p-3 shadow-soft md:hidden">
          <div className="flex flex-col gap-1 text-sm">
            <a href="#why" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 hover:bg-paper">
              Why LinkForge
            </a>
            <a href="#workflow" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 hover:bg-paper">
              How it works
            </a>
            <Link href="/login" className="rounded-xl px-3 py-2.5 hover:bg-paper">
              Sign in
            </Link>
            <Link href="/dashboard" className="rounded-xl bg-ink px-3 py-2.5 text-white">
              Open dashboard
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
