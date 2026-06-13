import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Role } from "@/generated/prisma/client";
import { ROLE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

type InvitationRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  service: {
    name: string;
  } | null;
  invitedBy?: {
    firstName: string;
    lastName: string;
  };
  expiresAt: Date;
  acceptedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
};

type InvitationState = "accepted" | "cancelled" | "expired" | "pending";

const invitationStateLabels: Record<InvitationState, string> = {
  accepted: "Acceptee",
  cancelled: "Annulee",
  expired: "Expiree",
  pending: "En attente",
};

const invitationStateClasses: Record<InvitationState, string> = {
  accepted: "bg-success text-white",
  cancelled: "bg-danger text-white",
  expired: "bg-warning text-white",
  pending: "bg-info text-white",
};

function getInvitationState(
  invitation: Pick<InvitationRow, "acceptedAt" | "cancelledAt" | "expiresAt">,
  now: Date
): InvitationState {
  if (invitation.acceptedAt) {
    return "accepted";
  }

  if (invitation.cancelledAt) {
    return "cancelled";
  }

  if (invitation.expiresAt < now) {
    return "expired";
  }

  return "pending";
}

function getInitials(invitation: Pick<InvitationRow, "firstName" | "lastName">) {
  return `${invitation.firstName.charAt(0)}${invitation.lastName.charAt(0)}`.toUpperCase();
}

function InvitationStatusBadge({
  invitation,
  now,
  compact = false,
}: {
  invitation: Pick<InvitationRow, "acceptedAt" | "cancelledAt" | "expiresAt">;
  now: Date;
  compact?: boolean;
}) {
  const state = getInvitationState(invitation, now);

  return (
    <Badge
      className={cn(
        "whitespace-nowrap",
        compact && "px-2 py-0.5 text-[0.68rem]",
        invitationStateClasses[state]
      )}
    >
      {invitationStateLabels[state]}
    </Badge>
  );
}

function InvitationRoleService({
  invitation,
  compact = false,
}: {
  invitation: InvitationRow;
  compact?: boolean;
}) {
  const badgeClassName = compact ? "px-2 py-0.5 text-[0.68rem]" : undefined;

  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant="outline" className={badgeClassName}>
        {ROLE_LABELS[invitation.role]}
      </Badge>
      {invitation.service ? (
        <Badge variant="secondary" className={badgeClassName}>
          {invitation.service.name}
        </Badge>
      ) : (
        <Badge variant="outline" className={badgeClassName}>
          Sans service
        </Badge>
      )}
    </div>
  );
}

export function RecentInvitationsList({
  invitations,
  now,
}: {
  invitations: InvitationRow[];
  now: Date;
}) {
  if (invitations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-secondary p-4 text-sm text-muted">
        Aucune invitation pour le moment.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {invitations.map((invitation) => (
        <article key={invitation.id} className="px-3 py-2.5">
          <div className="flex items-start gap-2.5">
            <Avatar className="size-8 text-xs">{getInitials(invitation)}</Avatar>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-1.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {invitation.firstName} {invitation.lastName}
                  </p>
                  <p className="truncate text-xs text-muted">{invitation.email}</p>
                </div>
                <InvitationStatusBadge invitation={invitation} now={now} compact />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <InvitationRoleService invitation={invitation} compact />
                <p className="text-xs text-muted">
                  {invitation.createdAt.toLocaleDateString("fr-FR")}
                </p>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function InvitationsTable({
  invitations,
  now,
}: {
  invitations: InvitationRow[];
  now: Date;
}) {
  if (invitations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-secondary p-4 text-sm text-muted">
        Aucune invitation pour le moment.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invite</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Role et service</TableHead>
          <TableHead>Envoyee par</TableHead>
          <TableHead>Dates</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.map((invitation) => (
          <TableRow key={invitation.id}>
            <TableCell>
              <div className="flex min-w-64 items-center gap-3">
                <Avatar className="size-9 text-xs">{getInitials(invitation)}</Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {invitation.firstName} {invitation.lastName}
                  </p>
                  <p className="truncate text-sm text-muted">{invitation.email}</p>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <InvitationStatusBadge invitation={invitation} now={now} />
            </TableCell>
            <TableCell>
              <InvitationRoleService invitation={invitation} />
            </TableCell>
            <TableCell className="text-sm text-muted">
              {invitation.invitedBy
                ? `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`
                : "Non renseigne"}
            </TableCell>
            <TableCell className="whitespace-nowrap text-xs text-muted">
              <p>Envoyee: {invitation.createdAt.toLocaleDateString("fr-FR")}</p>
              <p>Expire: {invitation.expiresAt.toLocaleDateString("fr-FR")}</p>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
