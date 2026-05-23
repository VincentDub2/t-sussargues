import { cn } from "@/lib/utils";

export function Avatar({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex size-10 items-center justify-center rounded-full bg-primary-deep text-sm font-semibold text-[var(--primary-foreground)]",
        className
      )}
    >
      {children}
    </div>
  );
}
