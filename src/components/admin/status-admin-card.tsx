"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  deleteInterventionStatus,
  toggleInterventionStatus,
  type AdminStatusActionState,
  updateInterventionStatus,
} from "@/app/(app)/admin/statuses/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type StatusAdminCardProps = {
  status: {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    isActive: boolean;
    isFinal: boolean;
    displayOrder: number;
    interventionsCount: number;
  };
};

const initialState: AdminStatusActionState = {};

function ActionButton({
  pendingLabel,
  idleLabel,
  variant = "outline",
}: {
  pendingLabel: string;
  idleLabel: string;
  variant?: "outline" | "secondary";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}

export function StatusAdminCard({ status }: StatusAdminCardProps) {
  const updateAction = updateInterventionStatus.bind(null, status.id);
  const toggleAction = toggleInterventionStatus.bind(null, status.id);
  const deleteAction = deleteInterventionStatus.bind(null, status.id);

  const [updateState, updateFormAction] = useActionState(updateAction, initialState);
  const [toggleState, toggleFormAction] = useActionState(toggleAction, initialState);
  const [deleteState, deleteFormAction] = useActionState(deleteAction, initialState);

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{status.name}</p>
        <Badge variant="outline">{status.isActive ? "Actif" : "Inactif"}</Badge>
        {status.isFinal ? <Badge>Final</Badge> : null}
        <Badge variant="outline">{status.interventionsCount} intervention(s)</Badge>
      </div>

      <form action={updateFormAction} className="mt-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-[1fr_1.1fr_140px_140px]">
          <Input name="name" defaultValue={status.name} required />
          <Input name="description" defaultValue={status.description ?? ""} />
          <Input name="color" defaultValue={status.color ?? ""} placeholder="#1E4FA3" />
          <Input name="displayOrder" type="number" defaultValue={String(status.displayOrder)} />
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            name="isFinal"
            type="checkbox"
            defaultChecked={status.isFinal}
            className="size-4 rounded border-border"
          />
          Statut final
        </label>

        <ActionButton pendingLabel="Enregistrement..." idleLabel="Mettre a jour" />
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <form action={toggleFormAction}>
          <ActionButton
            variant="secondary"
            pendingLabel="Mise a jour..."
            idleLabel={status.isActive ? "Desactiver" : "Activer"}
          />
        </form>
        <form action={deleteFormAction}>
          <ActionButton
            variant="secondary"
            pendingLabel="Suppression..."
            idleLabel="Supprimer"
          />
        </form>
        {toggleState.error ? <p className="text-sm text-danger">{toggleState.error}</p> : null}
        {toggleState.success ? (
          <p className="text-sm text-success">{toggleState.success}</p>
        ) : null}
        {updateState.error ? <p className="text-sm text-danger">{updateState.error}</p> : null}
        {updateState.success ? (
          <p className="text-sm text-success">{updateState.success}</p>
        ) : null}
        {deleteState.error ? <p className="text-sm text-danger">{deleteState.error}</p> : null}
        {deleteState.success ? (
          <p className="text-sm text-success">{deleteState.success}</p>
        ) : null}
      </div>
    </div>
  );
}
