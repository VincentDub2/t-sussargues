"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  type AdminUserActionState,
  toggleUserActiveState,
  updateUserAdministration,
} from "@/app/(app)/admin/users/actions";
import type { Role, UserStatus } from "@/generated/prisma/client";
import { ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/labels";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TableCell, TableRow } from "@/components/ui/table";

type UserAdminRowProps = {
  currentUserId: string;
  services: Array<{ id: string; name: string; isActive: boolean }>;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
    status: UserStatus;
    isActive: boolean;
    serviceId: string | null;
    serviceName: string | null;
  };
};

const roles: Role[] = ["admin", "elu", "responsable_service", "agent", "lecture"];

const initialState: AdminUserActionState = {};

function SaveButton({ formId }: { formId: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      form={formId}
      variant="outline"
      size="sm"
      disabled={pending}
      className="w-full"
    >
      {pending ? "..." : "Enregistrer"}
    </Button>
  );
}

function ToggleButton({ disabled, isActive }: { disabled: boolean; isActive: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="secondary" size="sm" disabled={disabled || pending}>
      {pending ? "..." : isActive ? "Desactiver" : "Reactiver"}
    </Button>
  );
}

export function UserAdminRow({ currentUserId, services, user }: UserAdminRowProps) {
  const updateAction = updateUserAdministration.bind(null, user.id);
  const toggleAction = toggleUserActiveState.bind(null, user.id);
  const [updateState, updateFormAction] = useActionState(updateAction, initialState);
  const [toggleState, toggleFormAction] = useActionState(toggleAction, initialState);
  const isCurrentUser = currentUserId === user.id;
  const updateFormId = `user-admin-update-${user.id}`;

  return (
    <TableRow>
      <TableCell className="min-w-64">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 shrink-0">
            {`${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`}
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">
                {user.firstName} {user.lastName}
              </p>
              {isCurrentUser ? <Badge className="shrink-0">Vous</Badge> : null}
            </div>
            <p className="truncate text-sm text-muted">{user.email}</p>
          </div>
        </div>
      </TableCell>

      <TableCell className="min-w-44">
        <div className="space-y-2">
          <SelectField
            form={updateFormId}
            name="role"
            defaultValue={user.role}
            className="h-9 text-xs"
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </SelectField>
        </div>
      </TableCell>

      <TableCell className="min-w-56">
        <div className="space-y-2">
          <SelectField
            form={updateFormId}
            name="serviceId"
            defaultValue={user.serviceId ?? ""}
            className="h-9 text-xs"
          >
            <option value="">Aucun service</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
                {!service.isActive ? " (inactif)" : ""}
              </option>
            ))}
          </SelectField>
        </div>
      </TableCell>

      <TableCell className="min-w-40">
        <div className="space-y-2">
          <Badge variant="outline" className="w-fit">
            {USER_STATUS_LABELS[user.status]}
          </Badge>
          <p className="text-xs text-muted">
            {ROLE_LABELS[user.role]}
            {user.serviceName ? ` · ${user.serviceName}` : ""}
          </p>
        </div>
      </TableCell>

      <TableCell className="min-w-56">
        <div className="space-y-2">
          <form id={updateFormId} action={updateFormAction}>
            <SaveButton formId={updateFormId} />
          </form>
          <form action={toggleFormAction}>
            <ToggleButton disabled={isCurrentUser} isActive={user.isActive} />
          </form>
          {toggleState.error ? <p className="text-xs text-danger">{toggleState.error}</p> : null}
          {toggleState.success ? <p className="text-xs text-success">{toggleState.success}</p> : null}
          {updateState.error ? <p className="text-xs text-danger">{updateState.error}</p> : null}
          {updateState.success ? <p className="text-xs text-success">{updateState.success}</p> : null}
        </div>
      </TableCell>
    </TableRow>
  );
}
