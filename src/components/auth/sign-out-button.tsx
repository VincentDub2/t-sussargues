"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SignOutButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  return (
    <form action={action}>
      <Button type="submit" variant="outline" className="w-full sm:w-auto">
        <LogOut />
        Deconnexion
      </Button>
    </form>
  );
}
