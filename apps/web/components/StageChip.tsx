import type { Stage } from '@/lib/types';

const STAGE_CONFIG: Record<Stage, { label: string; color: string }> = {
  GREEN: { label: '🟢 New', color: 'var(--stage-green)' },
  YELLOW: { label: '🟡 Enquiring', color: 'var(--stage-yellow)' },
  RED: { label: '🔴 Hot', color: 'var(--stage-red)' },
  BLUE: { label: '🔵 Lost', color: 'var(--stage-blue)' },
};

export function StageChip({ stage }: { stage: Stage }) {
  const { label, color } = STAGE_CONFIG[stage];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ color, border: `1px solid ${color}`, background: `${color}18` }}
    >
      {label}
    </span>
  );
}

export function StageDot({ stage }: { stage: Stage }) {
  const color = STAGE_CONFIG[stage].color;
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ background: color }}
    />
  );
}
