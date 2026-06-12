"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, LoaderCircle, LockKeyhole, Minus } from "lucide-react";

import {
  updateRolePermissionState,
  type RolePermissionActionState,
} from "@/app/(app)/admin/roles/actions";
import type { Role } from "@/generated/prisma/client";
import type { PermissionKey } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type PermissionToggleButtonProps = {
  role: Role;
  permission: PermissionKey;
  enabled: boolean;
};

const initialState: RolePermissionActionState = {};

function ToggleSubmitButton({
  currentEnabled,
  isLocked,
  onOptimisticToggle,
}: {
  currentEnabled: boolean;
  isLocked: boolean;
  onOptimisticToggle: (nextEnabled: boolean) => void;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={isLocked || pending}
      onClick={() => {
        if (!isLocked && !pending) {
          onOptimisticToggle(!currentEnabled);
        }
      }}
      title={isLocked ? "Le role administrateur est verrouille" : undefined}
      aria-pressed={currentEnabled}
      className={cn(
        "inline-flex h-8 w-20 items-center justify-center gap-2 rounded-md border text-xs font-semibold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
        currentEnabled
          ? "border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary-deep"
          : "border-border bg-card text-foreground hover:bg-secondary",
        pending && "scale-95 opacity-80",
        isLocked && "cursor-not-allowed opacity-55"
      )}
    >
      {isLocked ? (
        <LockKeyhole className="size-3.5" />
      ) : pending ? (
        <LoaderCircle className="size-3.5 animate-spin" />
      ) : currentEnabled ? (
        <Check className="size-3.5" />
      ) : (
        <Minus className="size-3.5" />
      )}
      <span className={cn("transition-transform duration-200", pending && "scale-95")}>
        {currentEnabled ? "Oui" : "Non"}
      </span>
    </button>
  );
}

export function PermissionToggleButton({
  role,
  permission,
  enabled,
}: PermissionToggleButtonProps) {
  const [currentEnabled, setCurrentEnabled] = useState(enabled);
  const enabledInputRef = useRef<HTMLInputElement>(null);
  const isLocked = role === "admin";

  async function submitPermissionChange(
    _previousState: RolePermissionActionState,
    formData: FormData
  ) {
    const result = await updateRolePermissionState(_previousState, formData);

    if (result.error) {
      setCurrentEnabled((value) => !value);
    }

    return result;
  }

  const [state, formAction] = useActionState(
    submitPermissionChange,
    initialState
  );

  function optimisticToggle(nextEnabled: boolean) {
    if (enabledInputRef.current) {
      enabledInputRef.current.value = String(nextEnabled);
    }

    setCurrentEnabled(nextEnabled);
  }

  return (
    <form action={formAction} className="flex flex-col items-center gap-1">
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="permission" value={permission} />
      <input
        ref={enabledInputRef}
        type="hidden"
        name="enabled"
        defaultValue={String(!enabled)}
      />
      <ToggleSubmitButton
        currentEnabled={currentEnabled}
        isLocked={isLocked}
        onOptimisticToggle={optimisticToggle}
      />
      {state.error ? (
        <p className="max-w-32 text-center text-[0.68rem] leading-4 text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
