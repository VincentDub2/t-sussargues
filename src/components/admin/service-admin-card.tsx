"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  type AdminServiceActionState,
  toggleServiceActiveState,
  updateService,
} from "@/app/(app)/admin/services/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ServiceAdminCardProps = {
  service: {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    usersCount: number;
  };
};

const initialState: AdminServiceActionState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? "Enregistrement..." : "Mettre a jour"}
    </Button>
  );
}

function ToggleButton({ isActive }: { isActive: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "Mise a jour..." : isActive ? "Desactiver" : "Activer"}
    </Button>
  );
}

export function ServiceAdminCard({ service }: ServiceAdminCardProps) {
  const updateAction = updateService.bind(null, service.id);
  const toggleAction = toggleServiceActiveState.bind(null, service.id);

  const [updateState, updateFormAction] = useActionState(updateAction, initialState);
  const [toggleState, toggleFormAction] = useActionState(toggleAction, initialState);

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{service.name}</p>
        <Badge variant="outline">{service.isActive ? "Actif" : "Inactif"}</Badge>
        <Badge variant="outline">{service.usersCount} utilisateur(s)</Badge>
      </div>

      <form action={updateFormAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_1.3fr_auto]">
        <Input name="name" defaultValue={service.name} required />
        <Input name="description" defaultValue={service.description ?? ""} />
        <SaveButton />
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <form action={toggleFormAction}>
          <ToggleButton isActive={service.isActive} />
        </form>
        {toggleState.error ? <p className="text-sm text-danger">{toggleState.error}</p> : null}
        {toggleState.success ? (
          <p className="text-sm text-success">{toggleState.success}</p>
        ) : null}
        {updateState.error ? <p className="text-sm text-danger">{updateState.error}</p> : null}
        {updateState.success ? (
          <p className="text-sm text-success">{updateState.success}</p>
        ) : null}
      </div>
    </div>
  );
}
