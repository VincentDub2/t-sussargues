# T-Sussargues

T-Sussargues is a web application designed for the municipal staff of Sussargues. Its goal is to centralize internal requests and make daily administrative workflows easier to track, especially support tickets, intervention requests, and purchase requests.

The project focuses on providing a clear back-office interface where city hall agents can create requests, follow their status, manage related documents, and keep a history of actions.

## Main Features

- Ticket and intervention request management
- Purchase request workflow
- User authentication and password reset
- Role-based administration
- Services, categories, statuses, and locations management
- Email notifications and request history tracking
- Document upload support for purchase requests

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Prisma
- PostgreSQL
- NextAuth

## Getting Started

```bash
pnpm install
cp .env.example .env
pnpm prisma:generate
pnpm dev
```

The application runs at `http://localhost:3000`.

## Project Context

This project was built as a practical internal tool for a local public administration. It demonstrates full-stack web development skills through authentication, database modeling, role management, workflow tracking, file handling, and a structured admin interface.
