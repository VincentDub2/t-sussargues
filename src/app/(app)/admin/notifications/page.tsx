import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { NotificationLogsTable } from "@/components/admin/notification-logs-table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getNotificationAdminSummary } from "@/lib/notification-admin";
import { prisma } from "@/lib/prisma";

export default async function AdminNotificationsPage() {
  const session = await auth();

  if (session?.user.role !== "admin") {
    redirect("/dashboard");
  }

  const [summary, recentLogs] = await Promise.all([
    getNotificationAdminSummary(),
    prisma.notificationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Administration</p>
            <CardTitle className="text-2xl">Notifications email</CardTitle>
            <CardDescription>
              Activez, adaptez et testez les principaux emails transactionnels sans toucher au code.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-secondary p-4">
              <p className="text-sm text-muted">Evenements configures</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{summary.totalCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary p-4">
              <p className="text-sm text-muted">Actifs</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{summary.enabledCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary p-4">
              <p className="text-sm text-muted">Desactives</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{summary.disabledCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regles du module</CardTitle>
            <CardDescription>
              Les destinataires metier restent calcules par l&apos;application. Les recipients ajoutes ici sont additionnels.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted">
            <p>Les templates utilisent des placeholders du type <code>{"{{firstName}}"}</code>.</p>
            <p>Un email de test contourne l&apos;activation globale pour verifier le rendu sans attendre un vrai evenement.</p>
            <p>Quand SMTP n&apos;est pas configure, l&apos;envoi reste journalise en mode previsualisation.</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Evenements</CardTitle>
          <CardDescription>
            Liste compacte des notifications configurees. Ouvrez un evenement pour modifier son template, ses destinataires ou envoyer un test.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evenement</TableHead>
                <TableHead>Etat</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Destinataires</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{event.label}</p>
                        <Badge variant="outline">{event.key}</Badge>
                      </div>
                      <p className="max-w-2xl text-sm leading-6 text-muted">
                        {event.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={event.isActive ? "bg-success text-white" : "bg-secondary text-foreground"}>
                      {event.isActive ? "Actif" : "Desactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate text-sm text-foreground">
                      {event.template?.subject ?? "Template manquant"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {event.placeholders.length} placeholders
                    </p>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-foreground">
                      {event._count.recipients}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/notifications/${event.key}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Ouvrir
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle>Logs recents</CardTitle>
            <CardDescription>
              Les 5 derniers envois, previsualisations et erreurs de notifications.
            </CardDescription>
          </div>
          <Link
            href="/admin/notifications/logs"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Voir tous les logs
          </Link>
        </CardHeader>
        <CardContent>
          <NotificationLogsTable
            logs={recentLogs}
            emptyMessage="Aucun log de notification pour le moment."
          />
        </CardContent>
      </Card>
    </div>
  );
}
