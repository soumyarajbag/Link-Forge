import { Suspense } from 'react';
import { AppLoader } from '@/components/app-loader';
import { LinksView } from '../dashboard-links';

export default function LinksPage() {
  return (
    <Suspense fallback={<AppLoader variant="panel" size="md" label="Preparing your links…" />}>
      <LinksView />
    </Suspense>
  );
}
