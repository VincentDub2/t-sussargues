import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { NotificationLogsTable } from "@/components/admin/notification-logs-table";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const LOGS_PER_PAGE = 20;

type AdminNotificationLogsPageProps = {
  searchParams: Promise<{
    page?: string;
  }>;
};

function getRequestedPage(pageParam?: string) {
  const parsedPage = Number(pageParam);

  if (!Number.isInteger(parsedPage) || parsedPage < 1) {
    return 1;
  }

  return parsedPage;
}

function getPageHref(page: number) {
  return `/admin/notifications/logs?page=${page}`;
}

export default async function AdminNotificationLogsPage({
  searchParams,
}: AdminNotificationLogsPageProps) {
  const [{ page }, session] = await Promise.all([searchParams, auth()]);

  if (session?.user.role !== "admin") {
    redirect("/dashboard");
  }

  const requestedPage = getRequestedPage(page);
  const totalLogs = await prisma.notificationLog.count();
  const totalPages = Math.max(1, Math.ceil(totalLogs / LOGS_PER_PAGE));
  const currentPage = Math.min(requestedPage, totalPages);
  const logs = await prisma.notificationLog.findMany({
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * LOGS_PER_PAGE,
    take: LOGS_PER_PAGE,
  });

  const firstItem = totalLogs === 0 ? 0 : (currentPage - 1) * LOGS_PER_PAGE + 1;
  const lastItem = Math.min(currentPage * LOGS_PER_PAGE, totalLogs);
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

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
          <CardTitle className="text-2xl">Logs de notifications</CardTitle>
          <CardDescription>
            Historique pagine des envois, previsualisations et erreurs de notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <p>
              {firstItem}-{lastItem} sur {totalLogs} logs
            </p>
            <p>
              Page {currentPage} / {totalPages}
            </p>
          </div>

          <NotificationLogsTable
            logs={logs}
            emptyMessage="Aucun log de notification pour le moment."
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={getPageHref(Math.max(1, currentPage - 1))}
              aria-disabled={!hasPreviousPage}
              className={cn(
                buttonVariants({ variant: "outline" }),
                !hasPreviousPage && "pointer-events-none opacity-50"
              )}
            >
              Precedent
            </Link>
            <Link
              href={getPageHref(Math.min(totalPages, currentPage + 1))}
              aria-disabled={!hasNextPage}
              className={cn(
                buttonVariants({ variant: "outline" }),
                !hasNextPage && "pointer-events-none opacity-50"
              )}
            >
              Suivant
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
