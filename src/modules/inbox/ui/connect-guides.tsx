import type { ReactNode } from "react";
import { CopyButton } from "./token-panel";

/** Where notices can come from, in the order they are offered. */
export const CONNECT_SOURCES = [
  { id: "push", label: "Notificaciones" },
  { id: "wallet", label: "Apple Pay" },
  { id: "sms", label: "SMS" },
  { id: "email", label: "Correo" },
] as const;
export type ConnectSource = (typeof CONNECT_SOURCES)[number]["id"];

export function isConnectSource(value: unknown): value is ConnectSource {
  return CONNECT_SOURCES.some((source) => source.id === value);
}

/** What each source needs and covers, shown under the guide's title. */
export const SOURCE_SUMMARIES: Record<ConnectSource, string> = {
  push: "Recomendado. Necesitas iOS 27 o superior. Se hace una vez por cada app de banco; cubre compras, transferencias y abonos.",
  wallet:
    "Necesitas iOS 17 o superior. Registra cada pago con Apple Pay con su comercio, monto y tarjeta. No cubre transferencias ni pagos con la tarjeta física.",
  sms: "Necesitas iOS 17 o superior. Se hace una vez por cada banco que te avise por SMS.",
  email:
    "Necesitas iOS 17 o superior y la cuenta agregada en la app Mail. Se hace una vez por cada banco.",
};

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-xs text-xs font-semibold">
        {n}
      </span>
      <div className="min-w-0 flex-1 text-sm leading-relaxed">{children}</div>
    </li>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="bg-surface-muted border-border border px-1.5 py-0.5 font-mono text-xs break-all">
      {children}
    </code>
  );
}

function Fields({ children }: { children: ReactNode }) {
  return <ul className="mt-1 flex list-[circle] flex-col gap-1 pl-5">{children}</ul>;
}

/** Steps shared by every source: the request the Shortcut sends to LucApp. */
function RequestSteps({
  from,
  endpoint,
  fields,
}: {
  from: number;
  endpoint: string;
  fields: ReactNode;
}) {
  return (
    <>
      <Step n={from}>
        Agrega la acción <strong>Obtener contenido de URL</strong> con esta URL:
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Code>{endpoint}</Code>
          <CopyButton value={endpoint} label="Copiar URL" />
        </div>
      </Step>
      <Step n={from + 1}>
        Toca <strong>Mostrar más</strong> y configura:
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
          <li>
            Método: <Code>POST</Code>
          </li>
          <li>
            Encabezado <Code>Authorization</Code> con el valor <Code>Bearer TU_TOKEN</Code> (la
            palabra Bearer, un espacio y el token del paso 1).
          </li>
          <li>
            Cuerpo de la solicitud <strong>JSON</strong> con estos campos de texto:
            <Fields>{fields}</Fields>
          </li>
        </ul>
      </Step>
    </>
  );
}

function TestStep({ n, children }: { n: number; children?: ReactNode }) {
  return (
    <Step n={n}>
      Para probar, agrega al final la acción <strong>Mostrar resultado</strong> con el{" "}
      <strong>Contenido de URL</strong>: LucApp responde si guardó el aviso (<Code>CREATED</Code>),
      si lo unió a otro (<Code>DUPLICATE</Code>) o si no era un movimiento (<Code>IGNORED</Code>).
      Cuando funcione, quita esa acción. {children}
    </Step>
  );
}

function PushGuide({ endpoint }: { endpoint: string }) {
  return (
    <>
      <Step n={1}>
        Abre <strong>Atajos</strong> → <strong>Automatización</strong> → <strong>+</strong> y elige{" "}
        <strong>Notificación</strong>.
      </Step>
      <Step n={2}>
        En <strong>App</strong> elige la app de tu banco y marca{" "}
        <strong>Ejecutar inmediatamente</strong>. No filtres por texto: LucApp descarta sola las
        notificaciones que no son movimientos (ofertas, claves, inicios de sesión).
      </Step>
      <RequestSteps
        from={3}
        endpoint={endpoint}
        fields={
          <>
            <li>
              <Code>channel</Code>: <Code>PUSH</Code>
            </li>
            <li>
              <Code>text</Code>: la variable <strong>Entrada del atajo</strong>. Si Atajos te deja
              elegir partes de la notificación, puedes mandar en su lugar <Code>title</Code> (el
              título) y <Code>body</Code> (el cuerpo o contenido).
            </li>
            <li>
              <Code>sender</Code>: el nombre del banco escrito a mano, por ejemplo{" "}
              <Code>Santander</Code>. Así LucApp sabe de qué banco es aunque el texto no lo diga.
            </li>
          </>
        }
      />
      <TestStep n={5}>
        Si llega vacío, toca la variable <strong>Entrada del atajo</strong> y elige el contenido de
        la notificación en vez de la notificación completa.
      </TestStep>
      <Step n={6}>
        Repite para cada app de banco o billetera. Si un movimiento llega además por Apple Pay, SMS
        o correo, LucApp lo junta en un solo aviso.
      </Step>
    </>
  );
}

function WalletGuide({ endpoint }: { endpoint: string }) {
  return (
    <>
      <Step n={1}>
        Abre <strong>Atajos</strong> → <strong>Automatización</strong> → <strong>+</strong> y elige{" "}
        <strong>Transacción</strong> (el ícono de Wallet).
      </Step>
      <Step n={2}>
        Marca las tarjetas que usas con Apple Pay, deja todas las categorías y marca{" "}
        <strong>Ejecutar inmediatamente</strong>.
      </Step>
      <RequestSteps
        from={3}
        endpoint={endpoint}
        fields={
          <>
            <li>
              <Code>channel</Code>: <Code>WALLET</Code>
            </li>
            <li>
              <Code>amount</Code>: de la <strong>Entrada del atajo</strong>, el{" "}
              <strong>Importe</strong>.
            </li>
            <li>
              <Code>merchant</Code>: de la entrada, el <strong>Comercio</strong>.
            </li>
            <li>
              <Code>card</Code>: de la entrada, la <strong>Tarjeta o pase</strong>.
            </li>
          </>
        }
      />
      <TestStep n={5} />
      <Step n={6}>
        La primera vez elige en LucApp a qué cuenta corresponde cada tarjeta de Wallet; después la
        sugiere sola. Si tu banco también notifica la compra, quedan unidas en un solo aviso.
      </Step>
    </>
  );
}

function MessageGuide({ endpoint, email }: { endpoint: string; email: boolean }) {
  return (
    <>
      <Step n={1}>
        Abre <strong>Atajos</strong> → <strong>Automatización</strong> → <strong>+</strong> y elige{" "}
        <strong>{email ? "Correo" : "Mensaje"}</strong>.
      </Step>
      <Step n={2}>
        En <strong>Remitente</strong> elige {email ? "la dirección" : "el número"} de tu banco
        {email ? (
          <>
            {" "}
            (por ejemplo <Code>@bancochile.cl</Code>).
          </>
        ) : (
          <>
            ; puedes además poner en <strong>El mensaje contiene</strong> el texto <Code>$</Code>.
          </>
        )}{" "}
        Marca <strong>Ejecutar inmediatamente</strong>.
      </Step>
      <RequestSteps
        from={3}
        endpoint={endpoint}
        fields={
          <>
            <li>
              <Code>channel</Code>: <Code>{email ? "EMAIL" : "SMS"}</Code>
            </li>
            <li>
              <Code>text</Code>: la variable <strong>Entrada del atajo</strong>
              {email ? (
                <>
                  , su <strong>Contenido</strong>
                </>
              ) : null}
              .
            </li>
            <li>
              <Code>sender</Code> (opcional): el <strong>Remitente</strong> de la entrada.
            </li>
            {email ? (
              <li>
                <Code>subject</Code> (opcional): el <strong>Asunto</strong>.
              </li>
            ) : null}
          </>
        }
      />
      <TestStep n={5} />
    </>
  );
}

/** Step-by-step Shortcuts automation for one source of notices. */
export function ConnectGuide({ via, endpoint }: { via: ConnectSource; endpoint: string }) {
  return (
    <ol className="flex flex-col gap-4">
      {via === "push" ? <PushGuide endpoint={endpoint} /> : null}
      {via === "wallet" ? <WalletGuide endpoint={endpoint} /> : null}
      {via === "sms" ? <MessageGuide endpoint={endpoint} email={false} /> : null}
      {via === "email" ? <MessageGuide endpoint={endpoint} email /> : null}
    </ol>
  );
}

/** A request to try the connection from a computer, for the chosen source. */
export function sampleRequest(via: ConnectSource, endpoint: string): string {
  const bodies: Record<ConnectSource, string> = {
    push: '{"channel":"PUSH","sender":"Santander","text":"Compraste $12.345 en LIDER EXPRESS con tu tarjeta ****1234"}',
    wallet:
      '{"channel":"WALLET","amount":"$12.345","merchant":"LIDER EXPRESS","card":"Visa Santander"}',
    sms: '{"channel":"SMS","text":"Compra por $12.345 en LIDER EXPRESS el 14/11/2026 12:34"}',
    email:
      '{"channel":"EMAIL","sender":"avisos@santander.cl","subject":"Compra","text":"Compra por $12.345 en LIDER EXPRESS el 14/11/2026 12:34"}',
  };
  return `curl -X POST ${endpoint} \\
  -H "Authorization: Bearer TU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '${bodies[via]}'`;
}
