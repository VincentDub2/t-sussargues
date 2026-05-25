"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import type { LoginActionState } from "@/app/login/actions";
import { authenticate } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordField } from "@/components/ui/password-field";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending}>
      {pending ? "Connexion..." : "Connexion"}
    </Button>
  );
}

const initialState: LoginActionState = {};

export function LoginForm() {
  const [state, formAction] = useActionState(authenticate, initialState);
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="identifier" className="text-sm font-medium text-foreground">
          Email ou identifiant
        </label>
        <Input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          placeholder="prenom.nom ou email"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Mot de passe
        </label>
        <PasswordField
          id="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={setPassword}
          showHints={false}
          required
        />
      </div>

      <div className="flex justify-end">
        <Link
          href="/reset-password"
          className="text-sm text-primary underline underline-offset-4"
        >
          Mot de passe oublie ?
        </Link>
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
