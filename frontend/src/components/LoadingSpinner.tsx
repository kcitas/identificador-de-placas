export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-(--color-text-muted)">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-(--color-border) border-t-(--color-accent)" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  )
}
