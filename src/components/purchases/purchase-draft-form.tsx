"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  type PurchaseActionState,
  updatePurchaseDraft,
} from "@/app/(app)/achats/actions";
import type { Priority } from "@/generated/prisma/client";
import { PRIORITY_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";

type PurchaseDraftFormProps = {
  purchase: {
    id: string;
    title: string;
    description: string;
    supplier: string | null;
    quantity: number | null;
    estimatedBudget: string | null;
    priority: Priority;
    serviceId: string | null;
  };
  services: Array<{ id: string; name: string }>;
  disabled?: boolean;
};

const initialState: PurchaseActionState = {};
const priorities: Priority[] = ["basse", "normale", "haute", "urgente"];

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={disabled || pending}>
      {pending ? "Enregistrement..." : "Mettre a jour le brouillon"}
    </Button>
  );
}

export function PurchaseDraftForm({
  purchase,
  services,
  disabled = false,
}: PurchaseDraftFormProps) {
  const action = updatePurchaseDraft.bind(null, purchase.id);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium text-foreground">
          Objet
        </label>
        <Input id="title" name="title" defaultValue={purchase.title} required disabled={disabled} />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Description
        </label>
        <Textarea
          id="description"
          name="description"
          defaultValue={purchase.description}
          required
          disabled={disabled}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="supplier" className="text-sm font-medium text-foreground">
            Fournisseur
          </label>
          <Input id="supplier" name="supplier" defaultValue={purchase.supplier ?? ""} disabled={disabled} />
        </div>
        <div className="space-y-2">
          <label htmlFor="quantity" className="text-sm font-medium text-foreground">
            Quantite
          </label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min="1"
            defaultValue={purchase.quantity ? String(purchase.quantity) : ""}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="estimatedBudget" className="text-sm font-medium text-foreground">
            Budget estime (EUR)
          </label>
          <Input
            id="estimatedBudget"
            name="estimatedBudget"
            inputMode="decimal"
            defaultValue={purchase.estimatedBudget ?? ""}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="priority" className="text-sm font-medium text-foreground">
            Priorite
          </label>
          <SelectField
            id="priority"
            name="priority"
            defaultValue={purchase.priority}
            disabled={disabled}
          >
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="serviceId" className="text-sm font-medium text-foreground">
          Service
        </label>
        <SelectField
          id="serviceId"
          name="serviceId"
          defaultValue={purchase.serviceId ?? ""}
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

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-success">{state.success}</p> : null}

      <SubmitButton disabled={disabled} />
    </form>
  );
}
