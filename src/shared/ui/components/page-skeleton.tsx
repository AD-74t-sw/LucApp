/** Placeholder shown instantly while a page streams its data. */
export function PageSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Cargando">
      <div className="bg-surface-muted mb-6 h-8 w-48 rounded-xs" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-surface-muted h-24 rounded-xs" />
        ))}
      </div>
      <div className="bg-surface-muted mt-4 h-64 rounded-xs" />
    </div>
  );
}
