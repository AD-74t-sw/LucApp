# Arquitectura

LucApp es un **monolito modular**: un solo despliegue, dividido en módulos por dominio con fronteras explícitas. Aloja dos apps sobre la misma cuenta: **Finanzas** y **Comidas** (ver [Apps](#apps-finanzas-y-comidas)). El objetivo es que el código sea fácil de entender (todos los módulos tienen la misma forma) y de escalar (un módulo crece o se reemplaza sin tocar a los demás).

## Mapa

```
src/
  app/              Rutas de Next.js. Solo enrutamiento y composición de pantallas.
                    apps.ts: qué app es cada ruta y su tema.
  instrumentation.ts, scheduler.ts   Tareas cada minuto (recordatorios de comidas).
  modules/
    identity/       Sesión (Supabase Auth), perfil y preferencias del usuario.
    access/         Registro, login, confirmación de correo y alta inicial (perfil + categorías).
    categories/     Categorías y subcategorías; clasificación fijo/variable y necesario/prescindible.
    accounts/       Cuentas y tarjetas.
    transactions/   Gastos, ingresos, transferencias, cuotas y saldos.
    debts/          Personas, deudas y abonos.
    currencies/     Tipos de cambio y conversión.
    metrics/        Métricas del dashboard (solo lectura).
    inbox/          Avisos del banco (correo, SMS) por revisar y categorizar.
    reimbursements/ Devoluciones (isapre, seguros, impuestos): en revisión, por recibir, devueltas.
    meals/          App de comidas: catálogo con íconos, bloques del día, registro y despensa.
    notifications/  Notificaciones push (Web Push): dispositivos, envío una sola vez por clave.
  shared/
    domain/         Money, monedas, fechas, Result. TypeScript puro.
    application/    Piezas de validación de entradas (Zod).
    infrastructure/ Cliente Prisma, variables de entorno, mapeos de filas.
    ui/             Componentes base, formateo, formularios.
prisma/             Esquema, migraciones y seed de demo.
supabase/           Configuración de Supabase local.
```

## Dependencias entre módulos

Los módulos forman un grafo sin ciclos. El mapa está en `eslint.config.mjs` (`MODULE_DEPENDENCIES`) y una importación que lo rompa falla en `pnpm lint`.

```
identity ◄── categories ◄──┐
    ▲            ▲          │
    │            │          │
 accounts ◄── transactions ◄── debts
    ▲            ▲             ▲
    └──── metrics ─────────────┘ (+ currencies, categories)
access ──► identity, categories
inbox ──► identity, accounts, categories, transactions
reimbursements ──► identity, accounts, categories, transactions
notifications ──► identity
meals ──► identity, notifications
```

Desde fuera de un módulo solo se importa su API pública:

- `@/modules/<nombre>`: API de servidor (casos de uso, consultas y tipos).
- `@/modules/<nombre>/ui`: componentes, acciones de formulario y constantes para la UI.

## Capas dentro de un módulo

```
modules/<nombre>/
  domain/          Tipos y reglas de negocio puras. Sin Prisma, Next, React, Supabase ni Zod.
  application/     Casos de uso y consultas. Esquemas Zod de entrada.
  infrastructure/  Repositorios Prisma y adaptadores (Supabase).
  ui/              Componentes React, Server Actions (actions.ts) y textos.
  index.ts         API pública de servidor.
```

Dirección de dependencias: `ui → application → infrastructure → domain`. ESLint lo verifica por carpeta.

Además, los archivos de `ui/` solo pueden importar **tipos** desde la API de servidor de otros módulos. Así nunca se cuela código de servidor (Prisma, `pg`) en el bundle del navegador. Las Server Actions (`ui/actions.ts`) son la excepción, porque corren solo en el servidor.

## Flujo de una mutación

```
<ActionForm>  →  Server Action (ui/actions.ts)
                   1. parseForm(schema, formData)    valida con Zod → errores por campo
                   2. requireUser()                  el userId sale de la sesión, nunca del cliente
                   3. caso de uso (application)      reglas de dominio → Result<T>
                   4. repositorio (infrastructure)   Prisma, siempre filtrando por userId
                   5. revalidatePath / redirect
```

- **Errores esperados** (validación, no existe, conflicto) se devuelven como `Result`, no como excepciones. Las excepciones quedan para bugs y fallas de infraestructura.
- **Operaciones de varias filas** (transferencia, plan de cuotas, deuda con movimiento) van en `runInTransaction`. Los repositorios aceptan un `db` opcional para participar de la transacción.
- `ActionForm` / `useFormAction` envían el formulario sin el reseteo automático de React 19, así no se pierde lo escrito cuando hay errores.

## Datos

- **Supabase** provee Postgres y la autenticación. Prisma es la única vía de acceso a los datos de la app.
- Las tablas viven en el schema **`app`**. La API REST de Supabase solo expone `public`, y una migración revoca a `anon` y `authenticated` cualquier acceso a `app`. La clave pública nunca puede leer datos financieros.
- **Aislamiento por usuario:** toda tabla de negocio tiene `userId` y todo repositorio lo exige. Los tests de integración intentan leer y escribir datos de otro usuario y deben fallar.
- **Dinero:** entero en la unidad mínima de su moneda (`BIGINT`; CLP en pesos, USD en centavos). Nunca `float`. `parseAmount` interpreta lo que escribe la persona ("12.500", "1.234,56").
- **Fechas:** columnas `DATE` manejadas como `"YYYY-MM-DD"` (`LocalDate`), y "hoy" según la zona horaria del usuario.
- **Saldo** = saldo inicial + suma de movimientos. No se guarda un saldo que pueda desincronizarse.
- **Movimientos con signo:** negativo = sale dinero de la cuenta. `kind` distingue `EXPENSE`, `INCOME`, `TRANSFER` y `DEBT`; las métricas de gasto solo cuentan `EXPENSE`/`INCOME`.
- **Cuotas:** un `InstallmentPlan` más un movimiento real por cuota, así gasto mensual y compromisos futuros salen de la misma tabla.
- **Deudas en las métricas:** una deuda nunca es gasto por sí misma; el resumen la muestra como pendiente ("Debes" / "Te deben"). Lo que **abonas a una deuda que debes** es gasto en la categoría de la deuda, en el mes del abono. Excepciones, para no contar dos veces: los abonos de un préstamo en efectivo registrado en una cuenta (lo que compraste con ese dinero ya es un gasto) y lo que te devuelven de un préstamo tuyo (no es ingreso). La regla vive en `paymentsCountAsSpending` (debts) y en `spendingSource` (metrics).
- **Monedas (CLP y USD):** cada movimiento guarda su moneda. Una tarjeta de crédito puede tener cupo internacional (`secondaryCurrency`), con su propio saldo y cupo. Pagar la deuda en la otra moneda es una transferencia cuyas dos patas quedan en monedas distintas; el monto en pesos (o el tipo de cambio del banco, en $ por USD) se pide al pagar (`resolveTransferAmounts`).
- **Tipo de cambio:** el módulo `currencies` obtiene el dólar observado de un `RateProvider` (puerto en `domain/`, adaptador `infrastructure/mindicador.ts`), lo guarda en `market_rates` (global, no por usuario) y lo refresca como mucho cada 3 horas; si la API falla, se usa el último valor guardado. Los tests usan un proveedor fijo (`tests/setup-rates.ts`) y nunca llaman a la red.
- **Valorización de compras en otra moneda con tarjeta:** mientras no se pagan valen la tasa del día; los pagos saldan primero la deuda más antigua y lo saldado vale lo que realmente costó (`valueCardCharges` en `metrics/domain`).
- **Métricas:** agregan en SQL (`metrics/infrastructure`). Es el único lugar autorizado a leer tablas de otros módulos, y nunca escribe. La conversión a la moneda base usa la tasa vigente al cierre de cada mes; si falta una tasa, la UI avisa qué moneda quedó fuera.

## Devoluciones (reimbursements)

- **Ciclo:** `IN_REVIEW` (pedida; monto desconocido, opcionalmente uno aproximado) → `APPROVED` (monto y rango de fechas en que debería llegar) → `RECEIVED`. También puede quedar `REJECTED`, y puede recibirse sin pasar por aprobada (a veces el pago llega sin aviso).
- **Atraso:** una aprobada cuyo rango ya terminó se marca "Atrasada" (`arrivalOf`); se calcula, no se guarda.
- **Dinero:** una devolución no es ingreso mientras está pendiente; solo se muestra en el resumen como "por recibir". Al marcarla devuelta se puede registrar un **ingreso** en una cuenta (por defecto en la categoría "Reembolsos"), enlazado por `transactionId`. Reabrirla o eliminarla borra ese ingreso (`deleteLinkedMovement`).

## Avisos del banco (inbox)

- **De dónde llegan** (canal del aviso). Ninguna app puede leer directamente las notificaciones de otra en iOS, y los bancos chilenos no tienen API pública (Open Finance parte en julio de 2027). Por eso cada fuente es un Atajo de iOS que hace `POST /api/inbox`:
  - `PUSH`: la notificación de la app del banco (automatización "Notificación", iOS 27+). Es la fuente principal: hoy los bancos avisan casi todo por ahí.
  - `WALLET`: un pago con Apple Pay (automatización "Transacción" de Wallet, iOS 17+). Llega estructurado (`amount`, `merchant`, `card`), no se lee de un texto (`domain/wallet.ts`).
  - `SMS` y `EMAIL`: lo que el banco todavía mande por esas vías.
  - `MANUAL`: pegado a mano en "Pegar aviso".
- **Ruido** (`domain/noise.ts`): la app del banco también notifica ofertas, claves e inicios de sesión. Una notificación `PUSH` sin monto, sin tipo de movimiento reconocible, o que parece oferta o alerta de seguridad, se responde `IGNORED` y no se guarda. Lo pegado a mano nunca se descarta.
- **Autenticación de la API:** un token por dispositivo (`Authorization: Bearer lucapp_…`). Solo se guarda su hash SHA-256 (`ingest_tokens`). La ruta está en `PUBLIC_PATHS` del proxy porque los Atajos no tienen sesión.
- **Lectura** (`inbox/domain/parse-notice.ts`): nunca falla; lo que no entiende queda en `null` y se completa al revisar.
  - Detecta banco, tipo (compra, transferencia enviada o recibida, pago de tarjeta, giro, abono), monto CLP/USD, comercio o contraparte, últimos 4 dígitos, fecha y hora.
  - Los bancos están en `bank-profiles.ts` (remitentes y cómo se nombran). Para agregar uno, suma una entrada; agrega `rules` propias solo si el lector genérico no basta, con un test que use un aviso real anonimizado.
- **Duplicados** (`duplicates.ts`):
  - El mismo texto por el mismo canal en menos de 10 minutos es un reenvío y se ignora. Para `PUSH` y `WALLET` la ventana es de 1 minuto: no traen hora, y dos pasajes de metro iguales en una mañana son dos movimientos.
  - Al unir, el aviso que se conserva recibe lo que no sabía (el comercio que trae Apple Pay, los dígitos de tarjeta que trae el banco).
  - Un aviso por **otro** canal con el mismo monto, moneda y tipo, a lo más un día de diferencia, y banco, tarjeta, comercio y hora compatibles, es el mismo movimiento: queda como `DUPLICATE` del primero.
  - Dos avisos por el mismo canal nunca se unen: dos cafés iguales el mismo día son dos.
  - Si ya registraste un movimiento del mismo monto cerca de esa fecha, la bandeja lo advierte.
- **Transferencias entre cuentas propias** (`suggestions.ts`). Se sugieren como transferencia, no como gasto, cuando:
  - ya lo registraste así antes;
  - es un pago de tarjeta;
  - es un giro (va a tu efectivo);
  - la contraparte tiene tu nombre (`isOwnName`);
  - llegó el mismo monto a otra de tus cuentas (`isTransferPair`).

  Al registrarla se cierran los dos avisos. Si el de la otra cuenta llega después, se cierra solo (`ALREADY_RECORDED`).

- **Tarjetas de Apple Pay** (`matchWalletCard`): la cuenta se sugiere por el nombre de la tarjeta en Wallet (si contiene el de una tarjeta o cuenta de LucApp) o por lo elegido la última vez con esa tarjeta, que se guarda como regla `wallet-card:<nombre>` en `notice_rules`. Pesa más que lo aprendido por comercio: la tarjeta usada es un hecho.
- **Para agregar una fuente nueva:** un canal en `NOTICE_CHANNELS` (y en el enum de Prisma), cómo se lee en `ingest-notice.ts` y su guía en `ui/connect-guides.tsx`.

- **Aprendizaje:** al registrar un aviso se guarda en `notice_rules`, por comercio normalizado, qué se eligió (tipo, categoría, cuenta, tarjeta). El próximo aviso de ese comercio parte con esa sugerencia.
- Registrar un aviso crea el movimiento con los casos de uso de `transactions`, en la misma transacción de base de datos que cambia el estado del aviso.

## Apps (finanzas y comidas)

- **Cuál app es cada página** lo decide la URL (`src/app/apps.ts`, `resolveApp`): `/meals/*` es Comidas y el resto del área privada es Finanzas. Ajustes es compartido y pertenece a la última app usada, que guarda la cookie `lucapp-app`. Esa misma cookie decide adónde abre `/` (y la app instalada, cuyo `start_url` es `/`): lo resuelve `src/proxy.ts`.
- **Tema fijo por app**, para saber de un vistazo dónde estás: Finanzas siempre oscuro y Comidas siempre claro, sin importar el sistema. Login y registro siguen al sistema. Un script en el `<head>` del layout raíz (`THEME_SCRIPT`) pone `data-theme` en `<html>` antes del primer pintado, así no hay parpadeo, y `ThemeSync` lo actualiza al navegar. Las funciones que se serializan en ese script (`resolveApp`, `applyTheme`) no pueden usar nada de fuera de su cuerpo; `apps.test.ts` lo comprueba.
- **Navegación:** el botón central del footer abre el selector de apps. Cada app tiene sus pestañas: Finanzas `Resumen | Movimientos | ⇄ | Revisar | Más` (más un botón flotante "Nuevo movimiento") y Comidas `Hoy | Despensa | ⇄ | Catálogo | Bloques`. En escritorio, el sidebar tiene las dos apps como pestañas.

## Comidas (meals)

- **Porciones:** todo se cuenta en porciones. Cada comida dice cuánto es una porción en su medida base (`MASS` en gramos, `VOLUME` en mililitros, `COUNT` en unidades o en una unidad propia, `unitLabel`: "taza", "pote"), y la despensa (`stock`) se guarda en esa misma medida base, así "1 kg de arroz" con porciones de 80 g son 12,5 porciones. Todo admite decimales (media porción, 0,5 palta): las cantidades son `DECIMAL` con 3 decimales y las porciones con 2 (`roundTo`). `toBaseAmount` interpreta lo que escribe la persona ("1,5" kg, "250" g o "3" porciones).
- **Bloques:** nombre, rango horario (`LocalTime` "HH:MM" en la zona del usuario; no cruzan la medianoche), aviso y porciones por categoría. Se repiten todos los días.
- **Registro** (`Meal` por bloque y día):
  - Se puede **planificar** antes (la comida de mañana ya está lista). Planificar no toca la despensa.
  - **Marcar como comido** con plan solo confirma, y ofrece "Comí otra cosa". Sin plan, pregunta qué se comió.
  - Comer descuenta de la despensa, nunca bajo cero. Cada ítem guarda lo que realmente se sacó (`taken`), y deshacer devuelve exactamente eso.
  - No se puede marcar como comido un día que aún no llega.
- **Faltantes** (`coverage`): por categoría, las porciones enteras en casa contra lo que piden los bloques activos por día × `coverageDays` (Ajustes → Comidas, 3 por defecto). Una categoría que ningún bloque usa nunca "falta".
- **Íconos de comidas:** Lucide (el set de la app) más Lucide Lab, que comparten grilla y trazo. El dominio solo conoce las claves (`FOOD_ICON_KEYS`). Los dibujos están en `ui/food-icons.tsx`. Para agregar uno, suma la clave y su entrada con nombre en español y palabras de búsqueda.

## Notificaciones y tareas programadas

- **Web Push** con claves VAPID (`make vapid`). Sin claves, las notificaciones quedan desactivadas y la app funciona igual. El service worker (`public/sw.js`) solo muestra notificaciones y abre su página al tocarlas; no hay caché offline.
- Cada dispositivo se suscribe por su cuenta desde Ajustes (o el aviso en "Hoy"). En iPhone, solo funciona con la app agregada a la pantalla de inicio.
- **Una sola vez por clave:** `notifyOnce(userId, key, payload)` reclama la clave en `notification_deliveries` (única por usuario) antes de enviar. Por eso el scheduler puede correr dos veces, en dos servidores o junto a un cron externo, sin duplicar avisos. Las suscripciones que el servicio de push da por perdidas (404/410) se borran.
- **Scheduler:** `src/instrumentation.ts` arranca `scheduler.ts`, que cada minuto llama a `runMealNotifications`. Esa función avisa los bloques en curso que no se han comido (si el servidor estuvo caído al empezar el bloque, avisa igual dentro del rango) y, una vez al día desde `shortageAlertTime`, la falta de comida. Solo recorre usuarios con dispositivos (`usersWithDevices`), y para cada uno usa las consultas normales, filtradas por `userId`.
- **Hosting que duerme:** con `SCHEDULER=off` y `CRON_SECRET`, un cron externo llama `POST /api/jobs/tick` cada minuto (`Authorization: Bearer …`). Sin `CRON_SECRET` la ruta responde 404.
- Los tests usan un sender falso (`tests/setup-push.ts`) y nunca llaman a los servicios de push.

## Next.js 16

- `cacheComponents` y `partialPrefetching` están activos. Cada ruta privada tiene su `loading.tsx` para que la navegación sea instantánea mientras la página trae datos.
- La sesión se lee con `await connection()`, porque es dinámica por definición. `src/proxy.ts` refresca la cookie de Supabase y redirige al login. Es solo una verificación optimista: cada página y acción vuelve a llamar a `requireUser()`.

## Cómo agregar algo

1. **¿Qué módulo es dueño?** Si es un concepto nuevo, crea `src/modules/<nombre>` con las cuatro capas y regístralo en `MODULE_DEPENDENCIES`.
2. **Esquema:** edita `prisma/schema.prisma` (con `userId` y `@@schema("app")`) y corre `make migration name=...`.
3. **Dominio primero:** reglas puras con tests unitarios.
4. **Caso de uso:** esquema Zod de entrada y función que devuelve `Result`.
5. **UI:** formulario con `ActionForm` y su Server Action en `ui/actions.ts`.
6. **Página:** en `src/app/(app)/...`, solo composición, más su `loading.tsx`.
7. `make check`.

## Diseño

- Todos los colores, bordes y fuentes son tokens en `src/app/globals.css` (claro y oscuro; el oscuro se activa con `data-theme="dark"`, ver [Apps](#apps-finanzas-y-comidas)). Los componentes usan solo nombres semánticos (`bg-surface`, `text-muted`, `bg-primary`, `text-accent`…), así que cambiar la apariencia es cambiar tokens.
- Dirección visual: plana y de alto contraste, inspirada en el sitio de Render. Fondo blanco con grilla fina, bordes de 1 px, esquinas casi rectas, acción principal en negro sólido, acento morado con moderación, títulos grandes con interletrado negativo y etiquetas monoespaciadas (`.eyebrow`). Tipografías: Geist y Geist Mono.
- Los formularios usan container queries (`@container` en `ActionForm`): pasan a dos columnas según su propio ancho, no el de la pantalla.
- La paleta de gráficos está validada para daltonismo y contraste en ambos modos (`--series-*`).
- Montos: lo positivo (ingresos, lo que te deben) va en morado (`text-positive`, el color de la marca) y lo negativo (gastos, lo que debes) en naranjo (`text-negative`). Los errores usan su propio rojo (`text-danger`), para no confundirse con montos.
- Toda página usa `PageHeader`. En el celular no hay logo arriba: la barra superior muestra el título centrado, el botón de volver a la izquierda (prop `back`) y el ícono de usuario a la derecha, que lleva a Ajustes. `PageHeader` dibuja título y volver sobre la barra que pone el layout, así cada página aporta su propio título (también los dinámicos, como el nombre de una cuenta) sin parpadeos. Las secciones que en el celular se abren desde "Más" usan `back={MORE_BACK}`; cerrar sesión es la última opción de "Más".
- Agregar o editar siempre abre un diálogo; las páginas no muestran formularios fijos.
  - `FormDialog` (en `shared/ui`) es un botón que abre un formulario en un diálogo. Al guardar con éxito, el formulario lo cierra solo (`useFormAction`).
  - "Nueva cuenta", "Nueva categoría" y "Nuevo movimiento" son rutas interceptadas: el slot `src/app/(app)/@modal` las muestra como diálogo sobre la página actual, y si se abre la URL directamente se ve la página completa. Ambas usan el mismo componente de contenido (`new-*.tsx` junto a la página).
  - Cada sección de la app tiene en `@modal` un `page.tsx` y un `[...rest]` que devuelven `null`: así, navegar a otra página cierra el diálogo. No uses un `[...catchAll]` en la raíz del slot: también capturaría `/login` y `/register` y los dejaría en 404. Si agregas una sección nueva, agrega también su `page.tsx` en `@modal`, y su `[...rest]` si tiene subpáginas.

## Instituciones financieras

- El catálogo vive en `src/modules/accounts/ui/institutions.ts`. Los **bancos** salen de la lista oficial de bancos supervisados por la CMF (noviembre 2026): solo bancos con atención a personas, sin sucursales de bancos extranjeros. A esos se suman las tarjetas de casas comerciales, las billeteras y las cooperativas más usadas.
- Las cuentas no tienen color propio: se identifican por su institución. La página de Cuentas las agrupa por banco (`groupByInstitution`, que junta nombres y alias del catálogo), y las cuentas sin institución, como el efectivo, quedan al final.
- Las cuentas guardan la institución como texto libre. `findInstitution` reconoce nombres y alias (por ejemplo "Banco Edwards" → Banco de Chile, "Banco Security" → Banco BICE, absorbido en 2025 según la CMF).
- Los logos son los íconos oficiales de cada sitio, descargados una vez a `public/institutions/`. La app no los pide a servicios externos en tiempo de ejecución. Son marcas de sus dueños y se usan solo para identificar a la institución.
- Para agregar una institución: suma su entrada al catálogo y su logo PNG (128×128) en `public/institutions/<id>.png`.
