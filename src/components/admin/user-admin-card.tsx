"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { Role, UserStatus } from "@/generated/prisma/client";
import { ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/labels";
import {
  type AdminUserActionState,
  toggleUserActiveState,
  updateUserAdministration,
} from "@/app/(app)/admin/users/actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";

type UserAdminCardProps = {
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

const roles: Role[] = [
  "admin",
  "elu",
  "responsable_service",
  "agent",
  "lecture",
];

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? "Enregistrement..." : "Enregistrer"}
    </Button>
  );
}

function ToggleButton({ disabled, isActive }: { disabled: boolean; isActive: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="secondary" disabled={disabled || pending}>
      {pending ? "Mise a jour..." : isActive ? "Desactiver" : "Reactiver"}
    </Button>
  );
}

const initialState: AdminUserActionState = {};

export function UserAdminCard({ currentUserId, services, user }: UserAdminCardProps) {
  const updateAction = updateUserAdministration.bind(null, user.id);
  const toggleAction = toggleUserActiveState.bind(null, user.id);

  const [updateState, updateFormAction] = useActionState(updateAction, initialState);
  const [toggleState, toggleFormAction] = useActionState(toggleAction, initialState);
  const isCurrentUser = currentUserId === user.id;

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar className="size-11">
            {`${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`}
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">
                {user.firstName} {user.lastName}
              </p>
              <Badge variant="outline">{USER_STATUS_LABELS[user.status]}</Badge>
              {isCurrentUser ? <Badge>Vous</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-muted">{user.email}</p>
            <p className="mt-1 text-sm text-muted">
              {ROLE_LABELS[user.role]}
              {user.serviceName ? ` · ${user.serviceName}` : ""}
            </p>
          </div>
        </div>

        <div className="w-full max-w-2xl space-y-3">
          <form action={updateFormAction} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <SelectField name="role" defaultValue={user.role}>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </SelectField>

            <SelectField name="serviceId" defaultValue={user.serviceId ?? ""}>
              <option value="">Aucun service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                  {!service.isActive ? " (inactif)" : ""}
                </option>
              ))}
            </SelectField>

            <SaveButton />
          </form>

          <div className="flex flex-wrap items-center gap-3">
            <form action={toggleFormAction}>
              <ToggleButton disabled={isCurrentUser} isActive={user.isActive} />
            </form>
            {toggleState.error ? <p className="text-sm text-danger">{toggleState.error}</p> : null}
            {toggleState.success ? (
              <p className="text-sm text-success">{toggleState.success}</p>
            ) : null}
            {updateState.error ? <p className="text-sm text-danger">{updateState.error}</p> : null}
            {updateState.success ? (
              <p className="text-sm text-success">{updateState.success}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
