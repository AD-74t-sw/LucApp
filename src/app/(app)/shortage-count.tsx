import { getCurrentUser } from "@/modules/identity";
import { getShortages } from "@/modules/meals";

/** Food categories that will not last at home, next to "Despensa". Render inside <Suspense>. */
export async function ShortageCount() {
  const user = await getCurrentUser();
  if (!user) return null;
  const count = (await getShortages(user.id)).length;
  if (count === 0) return null;
  return (
    <span
      className="bg-warning text-surface ml-auto min-w-5 rounded-xs px-1.5 text-center text-[11px] leading-5 font-semibold"
      aria-label={count === 1 ? "Falta 1 categoría" : `Faltan ${count} categorías`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
