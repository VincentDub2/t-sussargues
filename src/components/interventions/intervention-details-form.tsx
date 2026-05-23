"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  type InterventionActionState,
  updateInterventionDetails,
} from "@/app/(app)/interventions/actions";
import {
  OTHER_INTERVENTION_LOCATION_VALUE,
  PREDEFINED_INTERVENTION_LOCATIONS,
} from "@/lib/intervention-locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";

type InterventionDetailsFormProps = {
  intervention: {
    id: string;
    title: string;
    description: string;
    location: string | null;
    categoryId: string | null;
    serviceId: string | null;
  };
  categories: Array<{ id: string; name: string }>;
  services: Array<{ id: string; name: string }>;
  disabled?: boolean;
};

const initialState: InterventionActionState = {};

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={disabled || pending}>
      {pending ? "Enregistrement..." : "Mettre a jour la fiche"}
    </Button>
  );
}

export function InterventionDetailsForm({
  intervention,
  categories,
  services,
  disabled = false,
}: InterventionDetailsFormProps) {
  const action = updateInterventionDetails.bind(null, intervention.id);
  const [state, formAction] = useActionState(action, initialState);
  const isKnownLocation =
    intervention.location !== null &&
    (PREDEFINED_INTERVENTION_LOCATIONS as readonly string[]).includes(intervention.location);
  const initialLocationPreset =
    isKnownLocation && intervention.location
      ? intervention.location
      : intervention.location
        ? OTHER_INTERVENTION_LOCATION_VALUE
        : "";
  const [locationPreset, setLocationPreset] = useState<string>(initialLocationPreset);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium text-foreground">
          Titre
        </label>
        <Input id="title" name="title" defaultValue={intervention.title} required disabled={disabled} />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Description
        </label>
        <Textarea
          id="description"
          name="description"
          defaultValue={intervention.description}
          required
          disabled={disabled}
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
          disabled={disabled}
          required
        >
          <option value="">Choisir un lieu</option>
          {PREDEFINED_INTERVENTION_LOCATIONS.map((location) => (
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
            defaultValue={isKnownLocation ? "" : (intervention.location ?? "")}
            required
            disabled={disabled}
            placeholder="Precisez le lieu"
          />
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="categoryId" className="text-sm font-medium text-foreground">
            Categorie
          </label>
          <SelectField
            id="categoryId"
            name="categoryId"
            defaultValue={intervention.categoryId ?? ""}
            disabled={disabled}
          >
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
          <SelectField
            id="serviceId"
            name="serviceId"
            defaultValue={intervention.serviceId ?? ""}
            disabled={disabled}
          >
            <option value="">Sans service</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-success">{state.success}</p> : null}

      <SubmitButton disabled={disabled} />
    </form>
  );
}
