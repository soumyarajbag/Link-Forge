import { Suspense } from 'react';
import { LinksView } from '../dashboard-links';

export default function LinksPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-white/60" />}>
      <LinksView />
    </Suspense>
  );
}
