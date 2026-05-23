"use client";

import { useActionState } from "react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import {
  createLocalUser,
  type AdminUserActionState,
} from "@/app/(app)/admin/users/actions";
import type { Role } from "@/generated/prisma/client";
import { ROLE_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordField } from "@/components/ui/password-field";
import { SelectField } from "@/components/ui/select-field";

type CreateLocalUserFormProps = {
  roles: Role[];
  services: Array<{ id: string; name: string }>;
};

const initialState: AdminUserActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return <Button disabled={pending}>{pending ? "Creation..." : "Creer le compte"}</Button>;
}

export function CreateLocalUserForm({ roles, services }: CreateLocalUserFormProps) {
  const [state, formAction] = useActionState(createLocalUser, initialState);
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="localFirstName" className="text-sm font-medium text-foreground">
            Prenom
          </label>
          <Input id="localFirstName" name="firstName" required />
        </div>
        <div className="space-y-2">
          <label htmlFor="localLastName" className="text-sm font-medium text-foreground">
            Nom
          </label>
          <Input id="localLastName" name="lastName" required />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="localUsername" className="text-sm font-medium text-foreground">
          Identifiant
        </label>
        <Input
          id="localUsername"
          name="username"
          autoComplete="username"
          placeholder="prenom.nom"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="localPassword" className="text-sm font-medium text-foreground">
          Mot de passe temporaire
        </label>
        <PasswordField
          id="localPassword"
          name="password"
          autoComplete="new-password"
          placeholder="Minimum 8 caracteres"
          value={password}
          onChange={setPassword}
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="localRole" className="text-sm font-medium text-foreground">
            Role
          </label>
          <SelectField id="localRole" name="role" defaultValue="agent" required>
            {roles.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="space-y-2">
          <label htmlFor="localServiceId" className="text-sm font-medium text-foreground">
            Service
          </label>
          <SelectField id="localServiceId" name="serviceId" defaultValue="">
            <option value="">Aucun service</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      {state.error ? (
        <p className="rounded-md border border-danger/20 bg-danger/8 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-md border border-success/20 bg-success/8 px-3 py-2 text-sm text-success">
          {state.success}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
