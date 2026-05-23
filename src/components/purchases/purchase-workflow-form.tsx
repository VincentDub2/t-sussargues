"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  type PurchaseActionState,
  updatePurchaseStatus,
} from "@/app/(app)/achats/actions";
import type { PurchaseStatus } from "@/generated/prisma/client";
import { PURCHASE_STATUS_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";

type PurchaseWorkflowFormProps = {
  purchase: {
    id: string;
    status: PurchaseStatus;
    validationComment: string | null;
  };
  disabled?: boolean;
};

const initialState: PurchaseActionState = {};
const statuses: PurchaseStatus[] = ["validee", "refusee"];

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={disabled || pending}>
      {pending ? "Mise a jour..." : "Mettre a jour le statut"}
    </Button>
  );
}

export function PurchaseWorkflowForm({
  purchase,
  disabled = false,
}: PurchaseWorkflowFormProps) {
  const action = updatePurchaseStatus.bind(null, purchase.id);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="status" className="text-sm font-medium text-foreground">
          Decision
        </label>
        <SelectField id="status" name="status" defaultValue="validee" disabled={disabled}>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {PURCHASE_STATUS_LABELS[status]}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="space-y-2">
        <label htmlFor="validationComment" className="text-sm font-medium text-foreground">
          Commentaire
        </label>
        <Textarea
          id="validationComment"
          name="validationComment"
          defaultValue={purchase.validationComment ?? ""}
          placeholder="Optionnel"
          disabled={disabled}
        />
      </div>

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-success">{state.success}</p> : null}

      <SubmitButton disabled={disabled} />
    </form>
  );
}
