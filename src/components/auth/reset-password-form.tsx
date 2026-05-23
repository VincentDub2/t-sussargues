"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  resetPassword,
  type ResetPasswordActionState,
} from "@/app/reset-password/[token]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ResetPasswordFormProps = {
  token: string;
};

const initialState: ResetPasswordActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending}>
      {pending ? "Mise a jour..." : "Definir le nouveau mot de passe"}
    </Button>
  );
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const action = resetPassword.bind(null, token);
  const [state, formAction] = useActionState(action, initialState);

  if (state.success) {
    return (
      <div className="space-y-4 rounded-lg border border-success/20 bg-success/8 p-5">
        <p className="text-sm text-foreground">
          Votre mot de passe a bien ete reinitialise.
        </p>
        <Link href="/login">
          <Button>Retour a la connexion</Button>
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Nouveau mot de passe
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Au moins 8 caracteres"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
          Confirmation du mot de passe
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Confirmez votre mot de passe"
          required
        />
      </div>

      {state.error ? (
        <p className="rounded-md border border-danger/20 bg-danger/8 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
