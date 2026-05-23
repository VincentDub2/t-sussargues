"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  type InterventionActionState,
  updateInterventionWorkflow,
} from "@/app/(app)/interventions/actions";
import type { Priority } from "@/generated/prisma/client";
import { PRIORITY_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";

type InterventionWorkflowFormProps = {
  intervention: {
    id: string;
    statusId: string;
    priority: Priority;
    assignedToId: string | null;
  };
  statuses: Array<{ id: string; name: string }>;
  assignees: Array<{ id: string; name: string; serviceName: string | null }>;
  disabled?: boolean;
};

const initialState: InterventionActionState = {};
const priorities: Priority[] = ["basse", "normale", "haute", "urgente"];

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={disabled || pending}>
      {pending ? "Mise a jour..." : "Mettre a jour le suivi"}
    </Button>
  );
}

export function InterventionWorkflowForm({
  intervention,
  statuses,
  assignees,
  disabled = false,
}: InterventionWorkflowFormProps) {
  const action = updateInterventionWorkflow.bind(null, intervention.id);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="statusId" className="text-sm font-medium text-foreground">
          Statut
        </label>
        <SelectField
          id="statusId"
          name="statusId"
          defaultValue={intervention.statusId}
          disabled={disabled}
        >
          {statuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.name}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="priority" className="text-sm font-medium text-foreground">
            Priorite
          </label>
          <SelectField
            id="priority"
            name="priority"
            defaultValue={intervention.priority}
            disabled={disabled}
          >
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="space-y-2">
          <label htmlFor="assignedToId" className="text-sm font-medium text-foreground">
            Agent assigne
          </label>
          <SelectField
            id="assignedToId"
            name="assignedToId"
            defaultValue={intervention.assignedToId ?? ""}
            disabled={disabled}
          >
            <option value="">Aucune affectation</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.name}
                {assignee.serviceName ? ` · ${assignee.serviceName}` : ""}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-success">{state.success}</p> : null}

      <SubmitButton disabled={disabled || statuses.length === 0} />
    </form>
  );
}
