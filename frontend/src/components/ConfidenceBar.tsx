export function ConfidenceBar({ value }: { value: number | null }) {
  if (value === null) {
    return <div className="text-sm text-(--color-text-muted)">Sin dato de confianza</div>
  }
  const pct = Math.round(value * 100)
  const color = pct >= 70 ? 'var(--color-success)' : pct >= 40 ? 'var(--color-warning)' : 'var(--color-danger)'
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-(--color-text-muted)">
        <span>Confianza</span>
        <span className="font-mono font-semibold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-(--color-surface-2)">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}
