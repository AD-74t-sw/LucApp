/** Placeholder shown inside a dialog while its form loads. */
export function DialogSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-busy="true" aria-label="Cargando">
      <div className="bg-surface-muted h-10" />
      <div className="bg-surface-muted h-10" />
      <div className="bg-surface-muted h-24" />
    </div>
  );
}
