"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  submitPurchaseRequest,
  type PurchaseActionState,
} from "@/app/(app)/achats/actions";
import { Button } from "@/components/ui/button";

type SubmitPurchaseButtonProps = {
  purchaseId: string;
  status: "brouillon" | "informations_demandees";
  disabled?: boolean;
};

const initialState: PurchaseActionState = {};

function SubmitButton({
  disabled,
  status,
}: {
  disabled?: boolean;
  status: "brouillon" | "informations_demandees";
}) {
  const { pending } = useFormStatus();
  const idleLabel =
    status === "informations_demandees"
      ? "Renvoyer pour validation"
      : "Soumettre la demande";

  return (
    <Button disabled={disabled || pending}>
      {pending ? "Soumission..." : idleLabel}
    </Button>
  );
}

export function SubmitPurchaseButton({
  purchaseId,
  status,
  disabled = false,
}: SubmitPurchaseButtonProps) {
  const action = submitPurchaseRequest.bind(null, purchaseId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-2">
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-success">{state.success}</p> : null}
      <SubmitButton disabled={disabled} status={status} />
    </form>
  );
}
