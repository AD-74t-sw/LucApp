# LucApp

Aplicación web con dos apps en una cuenta:

- **Finanzas:** gastos e ingresos, cuentas bancarias, efectivo, billeteras, tarjetas de crédito y débito, compras en cuotas, deudas con personas, varias monedas y métricas.
- **Comidas:** catálogo de comidas con íconos, bloques del día con su horario, registro de lo que comes, despensa con aviso de faltantes y notificaciones.

El botón central del footer cambia de app. Finanzas se ve siempre en modo oscuro y Comidas en claro, para saber de un vistazo dónde estás.

- **Stack:** Next.js 16 (App Router, Server Actions) · TypeScript estricto · Prisma 7 · Supabase (Postgres + Auth) · Tailwind CSS 4 · Recharts.
- **Arquitectura:** monolito modular. Las reglas están en [docs/arquitectura.md](docs/arquitectura.md) y ESLint las verifica.
- **Todo corre en Docker:** tu máquina solo necesita Docker y `make`. No se instala nada global.

## Funcionalidades

| Área              | Qué hace                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cuentas           | Corriente/vista, ahorro, efectivo, billetera digital y tarjeta de crédito (cupo, día de facturación y de pago). Saldo calculado a partir de los movimientos. Archivar sin perder historial.                                                                                                                                                                                                                                                                                                                                                                                |
| Tarjetas          | Varias tarjetas por cuenta (titular, adicionales). Débito o crédito según la cuenta.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Movimientos       | Gastos, ingresos y transferencias entre cuentas (pagar la tarjeta es una transferencia). Filtros por fecha, cuenta, tarjeta, categoría, tipo y clasificación.                                                                                                                                                                                                                                                                                                                                                                                                              |
| Cuotas            | Compra en N cuotas: cada cuota es un gasto real en su mes. Progreso pagado/pendiente y compromisos futuros.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Categorías        | Dos niveles (categoría › subcategoría), con categorías por defecto al registrarse.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Tipo de gasto     | Cada gasto es **fijo o variable** y **necesario o prescindible**. La categoría define el valor por defecto y cada gasto puede cambiarlo.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Deudas            | Lo que te deben y lo que debes, por persona, con categoría y abonos parciales. Se pueden editar la deuda (persona, sentido, monto, fechas, categoría) y sus abonos. La deuda aparece en el resumen como pendiente; **cada abono a lo que debes cuenta como gasto** en la categoría de la deuda. Opcionalmente mueve dinero en una cuenta.                                                                                                                                                                                                                                  |
| Devoluciones      | Reembolsos de **isapre, seguros complementarios**, impuestos o compras. Se anotan apenas los pides, aunque no sepas el monto; luego se ingresa el monto aprobado y el **rango de fechas** en que debería llegar, y al final se marcan como **devueltas** (opcionalmente como ingreso en una cuenta). Las atrasadas se destacan.                                                                                                                                                                                                                                            |
| Monedas           | Por ahora solo **CLP y USD**. Las conversiones usan el **dólar observado** del Banco Central (vía mindicador.cl), que se obtiene y guarda solo. Las tarjetas de crédito pueden tener **cupo internacional**: las compras en la otra moneda quedan como una deuda aparte que vale la tasa del día hasta que se paga; al pagarla se ingresa lo que cobró el banco o su tipo de cambio, y ese gasto pasa a valer lo realmente pagado.                                                                                                                                         |
| Avisos del banco  | Bandeja **Por revisar** con tus movimientos apenas ocurren. Atajos de iPhone envían las **notificaciones de la app del banco** (iOS 27+), los pagos con **Apple Pay**, y los SMS o correos del banco. LucApp lee monto, comercio, tarjeta y fecha; descarta las notificaciones que no son movimientos; une los avisos de un mismo movimiento que llegan por varias vías y reconoce las **transferencias entre tus cuentas**. Recuerda cómo categorizaste cada comercio y a qué cuenta corresponde cada tarjeta de Wallet. Se configura en _Por revisar → Conectar avisos_. |
| Comidas: catálogo | Categorías (Proteínas, Carbohidratos…) y comidas con su **tamaño de porción** (g, kg, ml, l o unidades) y un **ícono** a elección entre ~100 de comidas (Lucide + Lucide Lab, mismo estilo que el resto de la app).                                                                                                                                                                                                                                                                                                                                                        |
| Comidas: bloques  | Desayuno, almuerzo, once, cena…: nombre, **horario**, cuántas porciones de cada categoría llevan y si avisar al empezar. Se repiten todos los días.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Comidas: registro | Por día y bloque. Se puede **planificar antes** (la comida de mañana ya lista); al comer, si había plan solo se confirma (o _Comí otra cosa_), y si no, pregunta qué comiste. Lo comido **se descuenta de la despensa**; deshacer lo devuelve.                                                                                                                                                                                                                                                                                                                             |
| Despensa          | Lo que hay en casa, en porciones o en su medida ("1,5 kg de arroz"). Avisa si alguna categoría **no alcanza para N días** de bloques (configurable en Ajustes).                                                                                                                                                                                                                                                                                                                                                                                                            |
| Notificaciones    | Push al **empezar cada bloque** (con lo planificado) y una vez al día si **falta comida**. Se activan por dispositivo en Ajustes; en iPhone, con la app agregada a la pantalla de inicio.                                                                                                                                                                                                                                                                                                                                                                                  |
| App en el iPhone  | Se instala desde Safari: _Compartir → Agregar a pantalla de inicio_. Se abre a pantalla completa, con su ícono.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Métricas          | Ingresos vs. gastos (12 meses), gasto por categoría y subcategoría, fijo/variable, necesario/prescindible, gasto por cuenta y tarjeta, patrimonio neto, uso de cupo y cuotas por pagar.                                                                                                                                                                                                                                                                                                                                                                                    |

## Primeros pasos

```bash
make setup        # crea .env, construye las imágenes, instala dependencias, levanta Supabase local y aplica migraciones
make up           # app en http://localhost:3100
make seed         # (opcional) datos de demo: demo@lucapp.local / demo12345
make vapid        # (opcional) claves para las notificaciones push: cópialas a VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en .env
```

Servicios locales de Supabase:

| Servicio                                  | URL                                                       |
| ----------------------------------------- | --------------------------------------------------------- |
| Supabase Studio (base de datos, usuarios) | http://localhost:56323                                    |
| Mailpit (correos de Auth)                 | http://localhost:56324                                    |
| API / Auth                                | http://localhost:56321                                    |
| Postgres                                  | `postgresql://postgres:postgres@localhost:56322/postgres` |

`make help` lista todos los comandos. Los más usados:

| Comando                                      | Para qué                                                     |
| -------------------------------------------- | ------------------------------------------------------------ |
| `make up` / `make down`                      | Levantar o detener la app                                    |
| `make supabase-start` / `make supabase-stop` | Levantar o detener Supabase local (los datos se conservan)   |
| `make migration name=algo`                   | Crear una migración después de editar `prisma/schema.prisma` |
| `make check`                                 | Lint (incluye reglas de arquitectura) + typecheck + tests    |
| `make e2e`                                   | Tests end-to-end con Playwright (con `make up` corriendo)    |
| `make sh`                                    | Shell dentro del contenedor de la app                        |

> Las dependencias viven en un volumen de Docker, así que el editor no ve `node_modules`. Si quieres autocompletado en VS Code, abre el proyecto con _Dev Containers_ (pendiente de configurar) o corre `make install` para regenerar tipos.

## Producción (Supabase Cloud)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Copia `.env.production.example` a `.env.production` y completa:
   - `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` (Settings › API Keys).
   - `DATABASE_URL` con el _transaction pooler_ (puerto 6543, `?pgbouncer=true`) y `DIRECT_URL` con el _session pooler_ o la conexión directa (puerto 5432).
   - `APP_URL` con la URL pública.
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (`make vapid`) y `VAPID_SUBJECT` con un contacto real (`mailto:…`), para las notificaciones.
   - Si tu hosting apaga el contenedor entre visitas, el aviso de cada minuto no corre solo: pon `SCHEDULER=off` y `CRON_SECRET`, y llama `POST /api/jobs/tick` cada minuto desde un cron con `Authorization: Bearer <CRON_SECRET>`.
3. En Supabase › Authentication › URL Configuration, define `Site URL = APP_URL` y agrega `APP_URL/auth/callback` a las Redirect URLs.
4. `make prod` aplica las migraciones (servicio `migrate`) y levanta la imagen de producción en http://localhost:3101. La misma imagen (`make build`, target `runner`) sirve para cualquier hosting de contenedores.

## Tests

- **Unitarios** (`src/**/*.test.ts`): reglas de dominio puras (dinero, fechas, cuotas, deudas, conversión, métricas, porciones, faltantes y recordatorios de comidas).
- **Integración** (`tests/integration`): casos de uso contra Postgres real, en una base `lucapp_test` separada que se crea y migra sola. Incluyen pruebas de **aislamiento entre usuarios**.
- **End-to-end** (`tests/e2e`): registro → cuentas → gasto → cuotas → deuda → dashboard, en escritorio y celular.

La CI (`.github/workflows/ci.yml`) corre lint, typecheck, formato y tests contra un Postgres de servicio, y construye la imagen de producción.
