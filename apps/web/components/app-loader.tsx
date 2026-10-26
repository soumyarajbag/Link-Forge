import { cn } from '@/lib/utils';

type LoaderSize = 'xs' | 'sm' | 'md' | 'lg';
type LoaderVariant = 'icon' | 'inline' | 'panel' | 'page';

const sizeClasses: Record<LoaderSize, string> = {
  xs: 'h-4 w-4',
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function AppLoader({
  label = 'Loading…',
  size = 'sm',
  variant = 'inline',
  className,
}: {
  label?: string;
  size?: LoaderSize;
  variant?: LoaderVariant;
  className?: string;
}) {
  const mark = (
    <span className={cn('relative inline-grid shrink-0 place-items-center', sizeClasses[size])} aria-hidden="true">
      <span className="absolute inset-0 rounded-full border-2 border-primary/15" />
      <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-r-violet-500 border-t-primary motion-reduce:animate-none" />
      <span className="h-[28%] w-[28%] animate-pulse rounded-full bg-gradient-to-br from-primary to-violet-500 motion-reduce:animate-none" />
    </span>
  );

  if (variant === 'icon') {
    return (
      <span role="status" aria-live="polite" className={cn('inline-flex items-center justify-center', className)}>
        {mark}
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  if (variant === 'panel' || variant === 'page') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className={cn(
          'grid place-items-center text-center',
          variant === 'page' ? 'min-h-screen bg-paper px-6' : 'min-h-64 rounded-3xl border border-border/70 bg-card/70 px-6',
          className,
        )}
      >
        <div className="flex flex-col items-center gap-3">
          {mark}
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
      </div>
    );
  }

  return (
    <span role="status" aria-live="polite" className={cn('inline-flex items-center gap-2', className)}>
      {mark}
      <span>{label}</span>
    </span>
  );
}
