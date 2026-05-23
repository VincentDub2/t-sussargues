"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { Role } from "@/generated/prisma/client";
import type { InvitationActionState } from "@/app/(app)/admin/users/invite/actions";
import { createInvitation } from "@/app/(app)/admin/users/invite/actions";
import { ROLE_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";

type InviteUserFormProps = {
  roles: Role[];
  services: Array<{ id: string; name: string }>;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return <Button disabled={pending}>{pending ? "Envoi..." : "Envoyer l'invitation"}</Button>;
}

const initialState: InvitationActionState = {};

export function InviteUserForm({ roles, services }: InviteUserFormProps) {
  const [state, formAction] = useActionState(createInvitation, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="firstName" className="text-sm font-medium text-foreground">
            Prenom
          </label>
          <Input id="firstName" name="firstName" required />
        </div>
        <div className="space-y-2">
          <label htmlFor="lastName" className="text-sm font-medium text-foreground">
            Nom
          </label>
          <Input id="lastName" name="lastName" required />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email professionnel
        </label>
        <Input id="email" name="email" type="email" required />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="role" className="text-sm font-medium text-foreground">
            Role
          </label>
          <SelectField id="role" name="role" defaultValue="agent" required>
            {roles.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="space-y-2">
          <label htmlFor="serviceId" className="text-sm font-medium text-foreground">
            Service
          </label>
          <SelectField id="serviceId" name="serviceId" defaultValue="">
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
        <div className="space-y-2 rounded-md border border-danger/20 bg-danger/8 px-3 py-3 text-sm text-danger">
          <p>{state.error}</p>
          {state.errorDetails ? (
            <div className="rounded border border-danger/15 bg-white/40 px-3 py-2 font-mono text-xs text-foreground">
              {state.errorDetails}
            </div>
          ) : null}
        </div>
      ) : null}

      {state.success ? (
        <div className="space-y-3 rounded-lg border border-success/20 bg-success/8 p-4 text-sm text-foreground">
          <p>
            Invitation creee pour <span className="font-medium">{state.email}</span>.
          </p>
          {state.deliveryStatus === "dev_preview" && state.previewUrl ? (
            <div className="space-y-2">
              <p className="text-muted">
                SMTP non configure: lien de previsualisation disponible pour tester le parcours.
              </p>
              <a
                href={state.previewUrl}
                className="break-all font-medium text-primary underline underline-offset-4"
              >
                {state.previewUrl}
              </a>
            </div>
          ) : (
            <p className="text-muted">Email d&apos;invitation envoye.</p>
          )}
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}
