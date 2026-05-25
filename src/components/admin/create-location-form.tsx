"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createInterventionLocation, type AdminLocationActionState } from "@/app/(app)/admin/locations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: AdminLocationActionState = {};
function SubmitButton(){ const { pending } = useFormStatus(); return <Button disabled={pending}>{pending ? "Creation..." : "Creer le lieu"}</Button>; }
export function CreateLocationForm(){
  const [state, formAction] = useActionState(createInterventionLocation, initialState);
  return <form action={formAction} className="space-y-4">
    <div className="space-y-2"><label htmlFor="name" className="text-sm font-medium text-foreground">Nom du lieu</label><Input id="name" name="name" required/></div>
    <div className="space-y-2"><label htmlFor="description" className="text-sm font-medium text-foreground">Description (optionnel)</label><Input id="description" name="description"/></div>
    <div className="space-y-2"><label htmlFor="address" className="text-sm font-medium text-foreground">Adresse (optionnel)</label><Input id="address" name="address"/></div>
    {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
    {state.success ? <p className="text-sm text-success">{state.success}</p> : null}
    <SubmitButton />
  </form>
}
