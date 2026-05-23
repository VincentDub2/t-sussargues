"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  deleteInterventionCategory,
  toggleInterventionCategory,
  type AdminCategoryActionState,
  updateInterventionCategory,
} from "@/app/(app)/admin/categories/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CategoryAdminCardProps = {
  category: {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    displayOrder: number;
    interventionsCount: number;
  };
};

const initialState: AdminCategoryActionState = {};

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

export function CategoryAdminCard({ category }: CategoryAdminCardProps) {
  const updateAction = updateInterventionCategory.bind(null, category.id);
  const toggleAction = toggleInterventionCategory.bind(null, category.id);
  const deleteAction = deleteInterventionCategory.bind(null, category.id);

  const [updateState, updateFormAction] = useActionState(updateAction, initialState);
  const [toggleState, toggleFormAction] = useActionState(toggleAction, initialState);
  const [deleteState, deleteFormAction] = useActionState(deleteAction, initialState);

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{category.name}</p>
        <Badge variant="outline">{category.isActive ? "Active" : "Inactive"}</Badge>
        <Badge variant="outline">{category.interventionsCount} intervention(s)</Badge>
      </div>

      <form action={updateFormAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_1.2fr_140px_auto]">
        <Input name="name" defaultValue={category.name} required />
        <Input name="description" defaultValue={category.description ?? ""} />
        <Input name="displayOrder" type="number" defaultValue={String(category.displayOrder)} />
        <ActionButton pendingLabel="Enregistrement..." idleLabel="Mettre a jour" />
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <form action={toggleFormAction}>
          <ActionButton
            variant="secondary"
            pendingLabel="Mise a jour..."
            idleLabel={category.isActive ? "Desactiver" : "Activer"}
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
