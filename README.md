# T-Sussargues

Socle technique de la future application T-Sussargues, basee sur Next.js, TypeScript, Tailwind CSS, shadcn/ui, Prisma et PostgreSQL.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Prisma
- Prisma Postgres / PostgreSQL

## Prerequis

- Node.js `24.16.0` LTS
- `pnpm` `10.12.1`

Le repo pinne ces versions via `packageManager`, `engines`, `.nvmrc` et `.node-version`.

## Installation

1. Installer la bonne version de Node.js.
2. Installer les dependances :

```bash
pnpm install
```

Si `pnpm` n'est pas encore disponible globalement dans la bonne version :

```bash
npx -y pnpm@10.12.1 install
```

3. Initialiser l'environnement local :

```bash
cp .env.example .env
```

4. Lancer l'application :

```bash
pnpm dev
```

L'application est ensuite disponible sur `http://localhost:3000`.

## Variables d'environnement

Le fichier `.env.example` documente les variables attendues :

- `DATABASE_URL`
- `AUTH_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `APP_URL`

## Prisma et base de donnees

Le projet est configure pour utiliser Prisma avec une base PostgreSQL. Pour cette etape 0, le setup par defaut documente est **Prisma Postgres** via `DATABASE_URL`.

Commandes utiles :

```bash
pnpm prisma:validate
pnpm prisma:generate
```

Le schema Prisma se trouve dans `prisma/schema.prisma` et la configuration Prisma dans `prisma.config.ts`.

## Structure actuelle

```txt
src/
  app/
  components/
    ui/
  lib/
  server/
prisma/
```

Cette etape prepare seulement le socle. Les modules metier, l'authentification et les ecrans applicatifs viendront ensuite.
