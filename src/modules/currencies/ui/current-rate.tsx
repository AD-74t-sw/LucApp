import { Card, CardTitle, formatDate, LOCALE } from "@/shared/ui";
import { getCurrentRate } from "../application/market-rates";

/** Shows the dollar rate the app is using right now. Async Server Component. */
export async function CurrentRateCard() {
  const current = await getCurrentRate();
  const number = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (
    <Card>
      <CardTitle description="Se actualiza solo, una vez al día hábil.">Tipo de cambio</CardTitle>
      {current ? (
        <div className="flex flex-col gap-1">
          <p className="eyebrow">Dólar observado · {formatDate(current.date)}</p>
          <p className="tabular text-[1.75rem] leading-tight font-medium tracking-[-0.03em]">
            1 USD = ${number.format(current.rate)} CLP
          </p>
          <p className="text-muted mt-2 text-sm">
            Fuente: Banco Central de Chile, vía mindicador.cl. Se usa para convertir lo que tienes
            en la otra moneda y las deudas de tarjeta aún no pagadas. Al pagar una deuda en otra
            moneda, se usa lo que realmente pagaste.
          </p>
        </div>
      ) : (
        <p className="text-warning text-sm">
          Todavía no se pudo obtener el dólar observado. Se intentará de nuevo automáticamente.
        </p>
      )}
    </Card>
  );
}
