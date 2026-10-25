import { Icon } from '@/components/icons';
import { Badge } from '@/components/ui';
import { Card } from '@/components/ui/card';

export function StatCard({
  label,
  value,
  change,
  tone,
  icon,
}: {
  label: string;
  value: string;
  change: string;
  tone: 'coral' | 'mint' | 'lilac' | 'sky';
  icon: 'click' | 'link' | 'users' | 'globe';
}) {
  const colors = {
    coral: 'bg-coral-50 text-coral-600',
    mint: 'bg-mint text-[#31875C]',
    lilac: 'bg-lilac text-[#6652BC]',
    sky: 'bg-sky text-[#2D7186]',
  };
  return (
    <Card className="group p-5 hover:-translate-y-1 hover:border-primary/15 hover:shadow-lift">
      <div className="flex items-start justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-2xl ${colors[tone]} transition group-hover:rotate-6`}>
          <Icon name={icon} size={18} />
        </span>
        <Badge tone="green">
          <Icon name="arrowUp" size={10} /> {change}
        </Badge>
      </div>
      <p className="mt-6 text-xs text-ink/45">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-[-.06em]">{value}</p>
    </Card>
  );
}
