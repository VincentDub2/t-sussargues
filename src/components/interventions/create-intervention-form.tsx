"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  createIntervention,
  type InterventionActionState,
} from "@/app/(app)/interventions/actions";
import type { Priority } from "@/generated/prisma/client";
import {
  OTHER_INTERVENTION_LOCATION_VALUE
} from "@/lib/intervention-locations";
import { PRIORITY_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";

type CreateInterventionFormProps = {
  categories: Array<{ id: string; name: string }>;
  services: Array<{ id: string; name: string }>;
  hasActiveStatus: boolean;
  locations: string[];
};

const initialState: InterventionActionState = {};
const priorities: Priority[] = ["basse", "normale", "haute", "urgente"];

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={disabled || pending}>
      {pending ? "Creation..." : "Creer l'intervention"}
    </Button>
  );
}

export function CreateInterventionForm({
  categories,
  services,
  hasActiveStatus,
  locations,
}: CreateInterventionFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(createIntervention, initialState);
  const [locationPreset, setLocationPreset] = useState<string>(
    locations[0] ?? ""
  );

  useEffect(() => {
    if (state.createdId) {
      router.push(`/interventions/${state.createdId}`);
    }
  }, [router, state.createdId]);

  if (!hasActiveStatus) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed border-border bg-secondary p-4 text-sm text-muted">
        <p>Aucun statut actif n&apos;est disponible pour ouvrir un ticket.</p>
        <Link href="/admin/statuses" className="text-primary underline underline-offset-4">
          Activer ou creer un statut d&apos;intervention
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium text-foreground">
          Titre
        </label>
        <Input id="title" name="title" required />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Description
        </label>
        <Textarea
          id="description"
          name="description"
          required
          placeholder="Precisez le contexte, l'urgence et toute information utile."
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="locationPreset" className="text-sm font-medium text-foreground">
          Lieu
        </label>
        <SelectField
          id="locationPreset"
          name="locationPreset"
          value={locationPreset}
          onChange={(event) => setLocationPreset(event.target.value)}
          required
        >
          {locations.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
          <option value={OTHER_INTERVENTION_LOCATION_VALUE}>Autre lieu</option>
        </SelectField>
        {locationPreset === OTHER_INTERVENTION_LOCATION_VALUE ? (
          <Input
            id="locationOther"
            name="locationOther"
            required
            placeholder="Precisez le lieu"
          />
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="categoryId" className="text-sm font-medium text-foreground">
            Categorie
          </label>
          <SelectField id="categoryId" name="categoryId" defaultValue="">
            <option value="">Aucune categorie</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="space-y-2">
          <label htmlFor="serviceId" className="text-sm font-medium text-foreground">
            Service
          </label>
          <SelectField id="serviceId" name="serviceId" defaultValue="">
            <option value="">Sans service</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="priority" className="text-sm font-medium text-foreground">
          Priorite
        </label>
        <SelectField id="priority" name="priority" defaultValue="normale">
          {priorities.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </SelectField>
      </div>

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.success && !state.createdId ? (
        <p className="text-sm text-success">{state.success}</p>
      ) : null}

      <SubmitButton disabled={!hasActiveStatus} />
    </form>
  );
}
