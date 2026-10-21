'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Icon } from './icons';
import { Button } from './ui';
import { Input } from './ui/input';

export function ShortenForm({ compact = false }: { compact?: boolean }) {
  const [destination, setDestination] = useState('');
  const [message, setMessage] = useState('');
  const [showSignIn, setShowSignIn] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = destination.trim();
    if (!/^https?:\/\/[^\s]+$/i.test(value)) {
      setShowSignIn(false);
      setMessage('Add a valid http or https link first.');
      return;
    }

    setMessage('Sign in to create this link in your workspace.');
    setShowSignIn(true);
  }

  return (
    <div className={`${compact ? 'max-w-xl' : 'max-w-2xl'}`}>
      <form
        onSubmit={submit}
        className={`group relative flex flex-col gap-2 rounded-2xl border border-white/70 bg-card/90 p-2 shadow-lift backdrop-blur-xl transition-all duration-300 focus-within:border-coral/40 focus-within:shadow-[0_20px_70px_rgba(255,107,97,.16)] sm:flex-row ${compact ? 'shadow-soft' : ''}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2">
          <Icon name="link" size={19} />
          <Input
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            placeholder="Paste a long link to make it memorable"
            className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-ink shadow-none focus-visible:ring-0"
            aria-label="Long URL"
          />
        </div>
        <Button type="submit" className="min-w-[126px]">
          Shorten link <Icon name="arrow" size={16} />
        </Button>
      </form>
      {message && (
        <div className="mt-3 flex items-center gap-2 text-xs text-ink/55">
          <span
            className={`grid h-4 w-4 place-items-center rounded-full ${showSignIn ? 'bg-coral-50 text-coral-600' : 'bg-mint text-[#2C8350]'}`}
          >
            <Icon name={showSignIn ? 'arrow' : 'x'} size={10} stroke={2.4} />
          </span>
          {message}
        </div>
      )}
      {showSignIn && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-coral/15 bg-coral-50 px-3.5 py-2.5 text-sm">
          <span className="truncate font-medium text-coral-600">Sign in to create a saved short link.</span>
          <Link
            href={`/login?destination=${encodeURIComponent(destination.trim())}`}
            className="shrink-0 text-xs font-semibold text-ink/55 transition hover:text-ink"
          >
            Sign in <Icon name="arrow" size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}
