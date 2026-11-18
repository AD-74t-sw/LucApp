import { Logo } from "@/shared/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-grid flex min-h-dvh flex-col">
      <header className="border-border bg-surface flex items-center border-b px-6 py-4">
        <Logo />
      </header>
      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-6 py-12 lg:grid-cols-[1fr_400px] lg:gap-16">
        <div className="hidden lg:block">
          <p className="eyebrow mb-4">Finanzas y comidas</p>
          <p className="text-6xl leading-[1.02] font-medium tracking-[-0.04em]">
            Tu día,
            <br />
            claro y en orden.
          </p>
          <p className="text-muted mt-6 max-w-md text-lg">
            Gastos, cuentas, tarjetas, cuotas y deudas en un solo lugar. Y tus comidas: bloques del
            día, lo que hay en la despensa y avisos cuando toca comer o falta algo.
          </p>
        </div>
        <div className="border-border bg-surface w-full border p-6 sm:p-8">{children}</div>
      </div>
    </main>
  );
}
