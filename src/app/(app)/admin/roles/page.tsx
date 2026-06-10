import { Fragment } from "react";
import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PermissionToggleButton } from "@/components/admin/permission-toggle-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  PERMISSION_GROUPS,
  PERMISSION_KEYS,
  ROLES,
  getRolePermissionMatrix,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function AdminRolesPage() {
  const session = await auth();

  if (session?.user.role !== "admin") {
    redirect("/dashboard");
  }

  const [matrix, usersByRole] = await Promise.all([
    getRolePermissionMatrix(),
    prisma.user.groupBy({
      by: ["role"],
      _count: {
        role: true,
      },
    }),
  ]);

  const userCountByRole = Object.fromEntries(
    ROLES.map((role) => [
      role,
      usersByRole.find((entry) => entry.role === role)?._count.role ?? 0,
    ])
  ) as Record<Role, number>;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">Administration</Badge>
              <Badge variant="secondary">RBAC</Badge>
            </div>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <ShieldCheck className="size-6 text-primary" />
              Roles et droits
            </CardTitle>
            <CardDescription>
              Matrice des actions autorisees par role. Les changements sont appliques cote serveur.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {ROLES.map((role) => (
              <div key={role} className="rounded-lg border border-border bg-secondary p-4">
                <p className="text-sm font-semibold text-foreground">
                  {ROLE_LABELS[role]}
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {userCountByRole[role]}
                </p>
                <p className="mt-1 text-xs text-muted">compte(s)</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Garde-fous</CardTitle>
            <CardDescription>
              Le role administrateur est verrouille pour conserver un acces complet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted">
            <p>Les permissions non modifiees utilisent les valeurs par defaut du code.</p>
            <p>Chaque changement est stocke comme override par role et par action.</p>
            <p>Les droits sensibles restent controles cote serveur, pas seulement dans l&apos;interface.</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Matrice des permissions</CardTitle>
          <CardDescription>
            Cliquez sur Oui/Non pour activer ou retirer une action a un role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-80">Action</TableHead>
                {ROLES.map((role) => (
                  <TableHead key={role} className="min-w-36 text-center">
                    {ROLE_LABELS[role]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSION_GROUPS.map((group) => (
                <Fragment key={group.label}>
                  <TableRow key={group.label} className="hover:bg-transparent">
                    <TableCell colSpan={ROLES.length + 1} className="bg-secondary">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{group.label}</p>
                        <p className="text-xs text-muted">{group.description}</p>
                      </div>
                    </TableCell>
                  </TableRow>

                  {group.permissions.map((permission) => (
                    <TableRow key={permission.key}>
                      <TableCell className="min-w-80">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{permission.label}</p>
                          <p className="text-xs leading-5 text-muted">
                            {permission.description}
                          </p>
                        </div>
                      </TableCell>
                      {ROLES.map((role) => (
                        <TableCell key={`${role}-${permission.key}`} className="text-center">
                          <div className="flex justify-center">
                            <PermissionToggleButton
                              role={role}
                              permission={permission.key}
                              enabled={matrix[role][permission.key]}
                            />
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
          <p className="mt-4 text-xs text-muted">
            {PERMISSION_KEYS.length} actions configurees sur {ROLES.length} roles.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
