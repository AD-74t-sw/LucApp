<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Proyecto LucApp

- Todo corre en Docker: nunca instales paquetes ni ejecutes `pnpm`/`node` en el host. Usa `make <comando>` o `docker compose run --rm app <comando>`. `node_modules` vive en un volumen, así que la documentación de Next está en el contenedor: `docker compose run --rm app cat node_modules/next/dist/docs/...`.
- Lee [docs/arquitectura.md](docs/arquitectura.md) antes de cambiar código. Las fronteras entre módulos y capas las verifica `pnpm lint`; no las desactives.
- Datos: Prisma sobre el Postgres de Supabase (schema `app`). Supabase solo se usa para autenticación.
- Dinero en enteros de unidad mínima (`Money`), fechas como `LocalDate`, errores esperados como `Result`.
- Prisma 7 no regenera el cliente al migrar: después de cambiar el esquema, `make migration name=...` (ya ejecuta `prisma generate`).
- Antes de terminar: `make check` (y `make e2e` si tocaste flujos de UI).
- La interfaz está en español; el código y los nombres, en inglés.
