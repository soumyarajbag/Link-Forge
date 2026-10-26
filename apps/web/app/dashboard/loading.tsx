import { AppLoader } from '@/components/app-loader';

export default function DashboardLoading() {
  return <AppLoader variant="panel" size="md" label="Loading dashboard…" className="min-h-[28rem]" />;
}
