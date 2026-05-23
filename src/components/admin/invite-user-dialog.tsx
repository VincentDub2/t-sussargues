"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";

import type { Role } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { CreateLocalUserForm } from "./create-local-user-form";
import { InviteUserForm } from "./invite-user-form";

type InviteUserDialogProps = {
  roles: Role[];
  services: Array<{ id: string; name: string }>;
};

export function InviteUserDialog({ roles, services }: InviteUserDialogProps) {
  const [mode, setMode] = useState<"email" | "local">("email");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <UserPlus className="size-4" />
          Inviter un utilisateur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un utilisateur</DialogTitle>
          <DialogDescription>
            Creez une invitation email ou un compte local pour les personnes sans adresse.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 rounded-lg border border-border bg-secondary p-1">
          <button
            type="button"
            onClick={() => setMode("email")}
            className={
              mode === "email"
                ? "rounded-md bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-sm"
                : "rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
            }
          >
            Invitation email
          </button>
          <button
            type="button"
            onClick={() => setMode("local")}
            className={
              mode === "local"
                ? "rounded-md bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-sm"
                : "rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
            }
          >
            Sans email
          </button>
        </div>
        {mode === "email" ? (
          <InviteUserForm roles={roles} services={services} />
        ) : (
          <CreateLocalUserForm roles={roles} services={services} />
        )}
      </DialogContent>
    </Dialog>
  );
}
