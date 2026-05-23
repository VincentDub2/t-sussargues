"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  requestPasswordReset,
  type RequestPasswordResetActionState,
} from "@/app/reset-password/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: RequestPasswordResetActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending}>
      {pending ? "Preparation..." : "Envoyer le lien"}
    </Button>
  );
}

export function RequestPasswordResetForm() {
  const [state, formAction] = useActionState(requestPasswordReset, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email professionnel
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="prenom.nom@exemple.fr"
          required
        />
      </div>

      {state.error ? (
        <p className="rounded-md border border-danger/20 bg-danger/8 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <div className="space-y-3 rounded-md border border-success/20 bg-success/8 px-3 py-3 text-sm text-foreground">
          <p>{state.success}</p>
          {state.previewUrl ? (
            <Link href={state.previewUrl} className="text-primary underline underline-offset-4">
              Ouvrir le lien de reset
            </Link>
          ) : null}
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}
