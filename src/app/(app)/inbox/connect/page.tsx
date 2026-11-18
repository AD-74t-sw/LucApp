import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { requireUser } from "@/modules/identity";
import { BANK_PROFILES, ingestEndpoint, listIngestTokens } from "@/modules/inbox";
import {
  CONNECT_SOURCES,
  ConnectGuide,
  CreateTokenForm,
  SOURCE_SUMMARIES,
  isConnectSource,
  revokeTokenAction,
  sampleRequest,
} from "@/modules/inbox/ui";
import { today } from "@/shared/domain";
import { Badge, Card, CardTitle, InlineAction, PageHeader, Tabs, formatDate } from "@/shared/ui";

export const metadata: Metadata = { title: "Conectar avisos" };

export default async function ConnectInboxPage({ searchParams }: PageProps<"/inbox/connect">) {
  const user = await requireUser();
  const requested = (await searchParams).via;
  const via = isConnectSource(requested) ? requested : "push";
  const tokens = await listIngestTokens(user.id);
  const endpoint = ingestEndpoint();

  return (
    <>
      <PageHeader
        back={{ href: "/inbox", label: "Por revisar" }}
        title="Conectar avisos"
        description="Un atajo de iPhone manda a LucApp cada movimiento apenas ocurre: las notificaciones de la app de tu banco, tus pagos con Apple Pay, y los SMS o correos del banco."
      />
      <div className="flex max-w-3xl flex-col gap-4">
        <Card>
          <CardTitle description="Cada iPhone o servicio usa su propio token. Si pierdes uno, elimínalo y crea otro.">
            1. Crea un token
          </CardTitle>
          <div className="flex flex-col gap-4">
            <CreateTokenForm />
            {tokens.length > 0 ? (
              <ul className="border-border divide-border divide-y border">
                {tokens.map((token) => (
                  <li key={token.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="flex-1 font-medium">{token.name}</span>
                    <span className="text-muted text-xs">
                      {token.lastUsedAt
                        ? `Último aviso: ${formatDate(today(user.timezone, token.lastUsedAt))}`
                        : "Sin uso todavía"}
                    </span>
                    <InlineAction
                      action={revokeTokenAction.bind(null, token.id)}
                      label=""
                      confirm={`¿Eliminar el token «${token.name}»? Los atajos que lo usan dejarán de funcionar.`}
                      icon={<Trash2 className="size-4" aria-label="Eliminar token" />}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardTitle description={SOURCE_SUMMARIES[via]}>
            2. Crea la automatización en Atajos
          </CardTitle>
          <Tabs
            label="Origen de los avisos"
            items={CONNECT_SOURCES.map((source) => ({
              href: source.id === "push" ? "/inbox/connect" : `/inbox/connect?via=${source.id}`,
              label: source.label,
              active: source.id === via,
            }))}
          />
          <ConnectGuide via={via} endpoint={endpoint} />
        </Card>

        <Card>
          <CardTitle description="Se reconocen el monto, el comercio o la persona, la tarjeta y la fecha. Si un aviso de tu banco no se lee bien, pégalo en «Pegar aviso» para ajustar el lector.">
            Bancos y billeteras reconocidos
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {BANK_PROFILES.map((profile) => (
              <Badge key={profile.institution}>{profile.institution}</Badge>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle description="Para probar desde un computador, o para conectar un reenvío automático de correos.">
            Probar la conexión
          </CardTitle>
          <pre className="bg-surface-muted overflow-x-auto p-3 font-mono text-xs leading-relaxed">
            {sampleRequest(via, endpoint)}
          </pre>
        </Card>
      </div>
    </>
  );
}
