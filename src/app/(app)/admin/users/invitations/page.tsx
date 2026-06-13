import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";

import { auth } from "@/auth";
import { InvitationsTable } from "@/components/admin/invitations-table";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const INVITATIONS_PER_PAGE = 20;

type AdminUserInvitationsPageProps = {
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
  return `/admin/users/invitations?page=${page}`;
}

export default async function AdminUserInvitationsPage({
  searchParams,
}: AdminUserInvitationsPageProps) {
  const [{ page }, session] = await Promise.all([searchParams, auth()]);

  if (session?.user.role !== "admin") {
    redirect("/dashboard");
  }

  const requestedPage = getRequestedPage(page);
  const totalInvitations = await prisma.userInvitation.count();
  const totalPages = Math.max(1, Math.ceil(totalInvitations / INVITATIONS_PER_PAGE));
  const currentPage = Math.min(requestedPage, totalPages);
  const now = new Date();

  const invitations = await prisma.userInvitation.findMany({
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * INVITATIONS_PER_PAGE,
    take: INVITATIONS_PER_PAGE,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      service: {
        select: {
          name: true,
        },
      },
      invitedBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      expiresAt: true,
      acceptedAt: true,
      cancelledAt: true,
      createdAt: true,
    },
  });

  const firstItem =
    totalInvitations === 0 ? 0 : (currentPage - 1) * INVITATIONS_PER_PAGE + 1;
  const lastItem = Math.min(currentPage * INVITATIONS_PER_PAGE, totalInvitations);
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/users"
          className={buttonVariants({ variant: "outline" })}
        >
          <ArrowLeft />
          Retour aux utilisateurs
        </Link>
        <Link
          href="/admin/users/logs"
          className={buttonVariants({ variant: "ghost" })}
        >
          <Mail />
          Logs email
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Historique des invitations</CardTitle>
          <CardDescription>
            Liste paginee des invitations utilisateur, distincte des logs techniques d&apos;email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <p>
              {firstItem}-{lastItem} sur {totalInvitations} invitations
            </p>
            <p>
              Page {currentPage} / {totalPages}
            </p>
          </div>

          <InvitationsTable invitations={invitations} now={now} />

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
