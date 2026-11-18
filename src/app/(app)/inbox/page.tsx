import type { Metadata } from "next";
import { ClipboardPaste, Link2 } from "lucide-react";
import { listAccounts, listCards } from "@/modules/accounts";
import { getCategoryTree } from "@/modules/categories";
import { getCurrentRate } from "@/modules/currencies";
import { requireUser } from "@/modules/identity";
import { listPendingNotices, listReviewedNotices } from "@/modules/inbox";
import { PasteNoticeForm, PendingNoticeList, ReviewedNoticeList } from "@/modules/inbox/ui";
import { today as todayIn } from "@/shared/domain";
import { ButtonLink, FormDialog, PageHeader, Tabs } from "@/shared/ui";
import { FROM_MORE, MORE_BACK } from "../nav-items";

export const metadata: Metadata = { title: "Por revisar" };

export default async function InboxPage({ searchParams }: PageProps<"/inbox">) {
  const user = await requireUser();
  const params = await searchParams;
  const reviewed = params.tab === "reviewed";
  // Phones reach this page from the bottom bar or from "Más"; only the latter goes back.
  const fromMore = params[FROM_MORE.param] === FROM_MORE.value;
  const from = fromMore ? `${FROM_MORE.param}=${FROM_MORE.value}` : "";

  return (
    <>
      <PageHeader
        title="Por revisar"
        back={fromMore ? MORE_BACK : undefined}
        description="Movimientos que llegaron por notificación del banco, Apple Pay, SMS o correo. Regístralos como gasto, ingreso o transferencia entre tus cuentas."
        actions={
          <>
            <ButtonLink href="/inbox/connect" variant="ghost" size="sm">
              <Link2 className="size-4" /> Conectar avisos
            </ButtonLink>
            <FormDialog
              trigger="Pegar aviso"
              title="Pegar aviso"
              description="Copia el texto de una notificación, un correo o un SMS de tu banco."
              variant="secondary"
              icon={<ClipboardPaste className="size-4" />}
            >
              <PasteNoticeForm />
            </FormDialog>
          </>
        }
      />
      <Tabs
        label="Avisos"
        items={[
          { href: from ? `/inbox?${from}` : "/inbox", label: "Pendientes", active: !reviewed },
          {
            href: `/inbox?tab=reviewed${from ? `&${from}` : ""}`,
            label: "Revisados",
            active: reviewed,
          },
        ]}
      />
      <div className="max-w-4xl">
        {reviewed ? (
          <ReviewedNoticeList
            notices={await listReviewedNotices(user.id)}
            timeZone={user.timezone}
          />
        ) : (
          await pendingList(user)
        )}
      </div>
    </>
  );
}

async function pendingList(user: Awaited<ReturnType<typeof requireUser>>) {
  const [items, accounts, cards, expenseCategories, incomeCategories, referenceRate] =
    await Promise.all([
      listPendingNotices(user),
      listAccounts(user.id),
      listCards(user.id),
      getCategoryTree(user.id, { kind: "EXPENSE" }),
      getCategoryTree(user.id, { kind: "INCOME" }),
      getCurrentRate(),
    ]);
  return (
    <PendingNoticeList
      items={items}
      context={{
        accounts,
        cards,
        expenseCategories,
        incomeCategories,
        today: todayIn(user.timezone),
        timeZone: user.timezone,
        referenceRate,
      }}
    />
  );
}
