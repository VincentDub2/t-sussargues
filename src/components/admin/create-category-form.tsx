"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createInterventionCategory,
  type AdminCategoryActionState,
} from "@/app/(app)/admin/categories/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: AdminCategoryActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return <Button disabled={pending}>{pending ? "Creation..." : "Creer la categorie"}</Button>;
}

export function CreateCategoryForm() {
  const [state, formAction] = useActionState(createInterventionCategory, initialState);

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

      <div className="space-y-2">
        <label htmlFor="displayOrder" className="text-sm font-medium text-foreground">
          Ordre d&apos;affichage
        </label>
        <Input id="displayOrder" name="displayOrder" type="number" defaultValue="0" />
      </div>

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-success">{state.success}</p> : null}

      <SubmitButton />
    </form>
  );
}
