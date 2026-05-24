"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";

import {
  createPurchaseRequest,
  type PurchaseActionState,
} from "@/app/(app)/achats/actions";
import type { Priority } from "@/generated/prisma/client";
import { PRIORITY_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";

type CreatePurchaseFormProps = {
  services: Array<{ id: string; name: string }>;
  defaultServiceId: string | null;
  canChooseService: boolean;
};

const initialState: PurchaseActionState = {};
const priorities: Priority[] = ["basse", "normale", "haute", "urgente"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button disabled={pending}>{pending ? "Creation..." : "Creer la demande"}</Button>;
}

export function CreatePurchaseForm({
  services,
  defaultServiceId,
  canChooseService,
}: CreatePurchaseFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(createPurchaseRequest, initialState);

  useEffect(() => {
    if (state.createdId) {
      router.push(`/achats/${state.createdId}`);
    }
  }, [router, state.createdId]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium text-foreground">
          Objet de la depense
        </label>
        <Input id="title" name="title" required />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Besoin / contexte
        </label>
        <Textarea
          id="description"
          name="description"
          required
          placeholder="Precisez le besoin, l'usage prevu, le contexte et les justificatifs attendus."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="supplier" className="text-sm font-medium text-foreground">
            Fournisseur pressenti
          </label>
          <Input id="supplier" name="supplier" placeholder="Optionnel" />
        </div>
        <div className="space-y-2">
          <label htmlFor="quantity" className="text-sm font-medium text-foreground">
            Quantite, si utile
          </label>
          <Input id="quantity" name="quantity" type="number" min="1" placeholder="1" />
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
            placeholder="1250.00"
          />
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
      </div>

      <div className="space-y-2">
        <label htmlFor="serviceId" className="text-sm font-medium text-foreground">
          Service
        </label>
        <SelectField
          id="serviceId"
          name="serviceId"
          defaultValue={defaultServiceId ?? ""}
          disabled={!canChooseService}
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
      {state.success && !state.createdId ? (
        <p className="text-sm text-success">{state.success}</p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
