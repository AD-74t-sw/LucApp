import { getCurrentUser } from "@/modules/identity";
import { countPendingNotices } from "@/modules/inbox";

/** Number of bank notices waiting for review, next to "Por revisar". Render inside <Suspense>. */
export async function PendingNoticeCount() {
  const user = await getCurrentUser();
  if (!user) return null;
  const count = await countPendingNotices(user.id);
  if (count === 0) return null;
  return (
    <span
      className="bg-accent text-accent-foreground ml-auto min-w-5 rounded-xs px-1.5 text-center text-[11px] leading-5 font-semibold"
      aria-label={`${count} por revisar`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
