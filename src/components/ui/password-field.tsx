"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

import { Button } from "./button";
import { Input } from "./input";

type PasswordFieldProps = Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  minLengthHint?: number;
  compareWith?: string;
  compareLabel?: string;
  helperText?: string;
  showHints?: boolean;
};

function getStatusTone(isPositive: boolean, isNeutral: boolean) {
  if (isNeutral) {
    return "text-muted";
  }

  return isPositive ? "text-success" : "text-warning";
}

export function PasswordField({
  className,
  value,
  onChange,
  minLengthHint = 8,
  compareWith,
  compareLabel = "Correspondance",
  helperText,
  showHints = true,
  ...props
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  const charactersLabel = `${value.length} caractere${value.length > 1 ? "s" : ""}`;
  const hasMinLength = value.length >= minLengthHint;
  const hasCompareTarget = typeof compareWith === "string";
  const hasMatch = hasCompareTarget && value.length > 0 && value === compareWith;

  const lengthStatusLabel =
    value.length === 0 ? `Minimum ${minLengthHint}` : hasMinLength ? "Valide" : "Trop court";
  const compareStatusLabel = hasCompareTarget
    ? value.length === 0
      ? compareLabel
      : hasMatch
        ? "OK"
        : "Non"
    : null;

  return (
    <div className="space-y-2">
      {showHints ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted">{helperText ?? charactersLabel}</span>
            <span className={cn("font-medium", getStatusTone(hasMinLength, value.length === 0))}>
              {lengthStatusLabel}
            </span>
          </div>
          {compareStatusLabel ? (
            <span
              className={cn(
                "font-medium",
                getStatusTone(hasMatch, value.length === 0)
              )}
            >
              {compareLabel} : {compareStatusLabel}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="relative">
        <Input
          {...props}
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn("pr-12", className)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 size-8 -translate-y-1/2 rounded-full text-muted hover:text-foreground"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={isVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          title={isVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        >
          {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
