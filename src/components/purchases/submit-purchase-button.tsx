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
  disabled?: boolean;
};

const initialState: PurchaseActionState = {};

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={disabled || pending}>
      {pending ? "Soumission..." : "Soumettre la demande"}
    </Button>
  );
}

export function SubmitPurchaseButton({
  purchaseId,
  disabled = false,
}: SubmitPurchaseButtonProps) {
  const action = submitPurchaseRequest.bind(null, purchaseId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-2">
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-success">{state.success}</p> : null}
      <SubmitButton disabled={disabled} />
    </form>
  );
}
