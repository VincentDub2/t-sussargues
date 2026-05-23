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

import { CreatePurchaseForm } from "./create-purchase-form";

type CreatePurchaseDialogProps = {
  services: Array<{ id: string; name: string }>;
  defaultServiceId: string | null;
  canChooseService: boolean;
};

export function CreatePurchaseDialog({
  services,
  defaultServiceId,
  canChooseService,
}: CreatePurchaseDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="size-4" />
          Nouvelle demande
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle demande</DialogTitle>
          <DialogDescription>
            Creez un brouillon de demande d&apos;achat avant soumission pour validation.
          </DialogDescription>
        </DialogHeader>
        <CreatePurchaseForm
          services={services}
          defaultServiceId={defaultServiceId}
          canChooseService={canChooseService}
        />
      </DialogContent>
    </Dialog>
  );
}
