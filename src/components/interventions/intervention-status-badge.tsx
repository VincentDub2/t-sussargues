import { Badge } from "@/components/ui/badge";

type InterventionStatusBadgeProps = {
  label: string;
  color?: string | null;
};

export function InterventionStatusBadge({
  label,
  color,
}: InterventionStatusBadgeProps) {
  return (
    <Badge variant="outline" className="gap-2">
      <span
        className="size-2 rounded-full"
        style={{ backgroundColor: color || "var(--primary)" }}
      />
      <span>{label}</span>
    </Badge>
  );
}
