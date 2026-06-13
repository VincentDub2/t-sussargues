import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { NotificationEventCard } from "@/components/admin/notification-event-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getNotificationAdminEvent } from "@/lib/notification-admin";

type AdminNotificationDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminNotificationDetailPage({
  params,
}: AdminNotificationDetailPageProps) {
  const [{ id }, session] = await Promise.all([params, auth()]);

  if (session?.user.role !== "admin") {
    redirect("/dashboard");
  }

  const event = await getNotificationAdminEvent(id);

  if (!event) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/notifications"
          className={buttonVariants({ variant: "outline" })}
        >
          Retour aux notifications
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-2xl">{event.label}</CardTitle>
            <Badge variant="outline">{event.key}</Badge>
          </div>
          <CardDescription>{event.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-secondary p-4">
            <p className="text-sm text-muted">Etat</p>
            <p className="mt-2 font-semibold text-foreground">
              {event.isActive ? "Actif" : "Desactive"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary p-4">
            <p className="text-sm text-muted">Destinataires additionnels</p>
            <p className="mt-2 font-semibold text-foreground">
              {event.recipients.length}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary p-4">
            <p className="text-sm text-muted">Placeholders</p>
            <p className="mt-2 font-semibold text-foreground">
              {event.placeholders.length}
            </p>
          </div>
        </CardContent>
      </Card>

      <NotificationEventCard
        event={event}
        placeholders={event.placeholders}
      />
    </div>
  );
}
