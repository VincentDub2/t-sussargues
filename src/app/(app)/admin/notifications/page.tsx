import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { NotificationEventCard } from "@/components/admin/notification-event-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ensureNotificationCatalog,
  NOTIFICATION_EVENT_DEFINITIONS,
} from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export default async function AdminNotificationsPage() {
  const session = await auth();

  if (session?.user.role !== "admin") {
    redirect("/dashboard");
  }

  await ensureNotificationCatalog();

  const [events, recentLogs] = await Promise.all([
    prisma.notificationEvent.findMany({
      include: {
        template: true,
        recipients: {
          orderBy: [{ createdAt: "asc" }],
        },
      },
    }),
    prisma.notificationLog.findMany({
      where: {
        event: {
          in: [...NOTIFICATION_EVENT_DEFINITIONS.map((item) => item.key)],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 16,
    }),
  ]);

  const eventsByKey = new Map(events.map((event) => [event.key, event]));
  const orderedEvents = NOTIFICATION_EVENT_DEFINITIONS.map((definition) => {
    const event = eventsByKey.get(definition.key);

    if (!event) {
      return null;
    }

    return {
      ...event,
      placeholders: definition.placeholders,
    };
  }).filter(Boolean);

  const enabledCount = events.filter((event) => event.isActive).length;
  const disabledCount = events.length - enabledCount;

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
              <p className="mt-2 text-2xl font-semibold text-foreground">{events.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary p-4">
              <p className="text-sm text-muted">Actifs</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{enabledCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary p-4">
              <p className="text-sm text-muted">Desactives</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{disabledCount}</p>
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

      <section className="space-y-4">
        {orderedEvents.map((event) =>
          event ? (
            <NotificationEventCard
              key={event.id}
              event={event}
              placeholders={event.placeholders}
            />
          ) : null
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Logs recents</CardTitle>
          <CardDescription>
            Historique recent des envois, previsualisations et erreurs de notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentLogs.length > 0 ? (
            recentLogs.map((log) => (
              <div key={log.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{log.recipient}</p>
                  <Badge variant="outline">{log.status}</Badge>
                  <Badge variant="outline">{log.event}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{log.subject}</p>
                <p className="mt-1 text-xs text-muted">
                  {log.createdAt.toLocaleString("fr-FR")}
                </p>
                {log.errorMessage ? (
                  <div className="mt-3 rounded border border-border bg-secondary px-3 py-2 font-mono text-xs text-foreground">
                    {log.errorMessage}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-secondary p-4 text-sm text-muted">
              Aucun log de notification pour le moment.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
