"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createService,
  type AdminServiceActionState,
} from "@/app/(app)/admin/services/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: AdminServiceActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return <Button variant="default" disabled={pending}>{pending ? "Creation..." : "Creer le service"}</Button>;
}

export function CreateServiceForm() {
  const [state, formAction] = useActionState(createService, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Nom du service
        </label>
        <Input id="name" name="name" required />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Description
        </label>
        <Input id="description" name="description" />
      </div>

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-success">{state.success}</p> : null}

      <SubmitButton />
    </form>
  );
}
