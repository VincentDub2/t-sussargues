"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createInterventionStatus,
  type AdminStatusActionState,
} from "@/app/(app)/admin/statuses/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: AdminStatusActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return <Button disabled={pending}>{pending ? "Creation..." : "Creer le statut"}</Button>;
}

export function CreateStatusForm() {
  const [state, formAction] = useActionState(createInterventionStatus, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Nom
        </label>
        <Input id="name" name="name" required />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Description
        </label>
        <Input id="description" name="description" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="color" className="text-sm font-medium text-foreground">
            Couleur
          </label>
          <Input id="color" name="color" placeholder="#1E4FA3" />
        </div>
        <div className="space-y-2">
          <label htmlFor="displayOrder" className="text-sm font-medium text-foreground">
            Ordre d&apos;affichage
          </label>
          <Input id="displayOrder" name="displayOrder" type="number" defaultValue="0" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input name="isFinal" type="checkbox" className="size-4 rounded border-border" />
        Statut final
      </label>

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-success">{state.success}</p> : null}

      <SubmitButton />
    </form>
  );
}
