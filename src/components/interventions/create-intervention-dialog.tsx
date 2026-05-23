"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { CreateInterventionForm } from "./create-intervention-form";

type CreateInterventionDialogProps = {
  categories: Array<{ id: string; name: string }>;
  services: Array<{ id: string; name: string }>;
  hasActiveStatus: boolean;
};

export function CreateInterventionDialog({
  categories,
  services,
  hasActiveStatus,
}: CreateInterventionDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="size-4" />
          Creer un ticket
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Creer un ticket</DialogTitle>
          <DialogDescription>
            Signalez une intervention et renseignez les informations utiles au traitement.
          </DialogDescription>
        </DialogHeader>
        <CreateInterventionForm
          categories={categories}
          services={services}
          hasActiveStatus={hasActiveStatus}
        />
      </DialogContent>
    </Dialog>
  );
}
