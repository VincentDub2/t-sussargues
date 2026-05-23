"use client";

import {
  ArrowUpDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { Priority } from "@/generated/prisma/client";
import { PRIORITY_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { InterventionStatusBadge } from "./intervention-status-badge";

type InterventionRecord = {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  priority: Priority;
  statusId: string;
  statusLabel: string;
  statusColor: string | null;
  requesterName: string;
  serviceId: string | null;
  serviceName: string | null;
  categoryName: string | null;
  assignedToName: string | null;
};

type InterventionsDataTableProps = {
  interventions: InterventionRecord[];
};

type SortKey =
  | "ticketNumber"
  | "title"
  | "requester"
  | "service"
  | "priority"
  | "status"
  | "category";
type SortDirection = "asc" | "desc";

const pageSizeOptions = [10, 20, 50];
const priorityOptions: Priority[] = ["basse", "normale", "haute", "urgente"];

function toggleDirection(currentKey: SortKey, currentDirection: SortDirection, nextKey: SortKey) {
  if (currentKey !== nextKey) {
    return "asc";
  }

  return currentDirection === "asc" ? "desc" : "asc";
}

export function InterventionsDataTable({ interventions }: InterventionsDataTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("ticketNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const normalizedSearch = search.trim().toLowerCase();
  const hasActiveFilters =
    Boolean(normalizedSearch) ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    serviceFilter !== "all";

  const statusOptions = Array.from(
    new Map(
      interventions.map((intervention) => [
        intervention.statusId,
        intervention.statusLabel,
      ])
    )
  ).sort(([, leftLabel], [, rightLabel]) => leftLabel.localeCompare(rightLabel, "fr"));

  const serviceOptions = Array.from(
    new Map(
      interventions
        .filter((intervention) => intervention.serviceId)
        .map((intervention) => [
          intervention.serviceId as string,
          intervention.serviceName ?? "Sans service",
        ])
    )
  ).sort(([, leftLabel], [, rightLabel]) => leftLabel.localeCompare(rightLabel, "fr"));

  const filteredInterventions = interventions.filter((intervention) => {
    if (statusFilter !== "all" && intervention.statusId !== statusFilter) {
      return false;
    }

    if (priorityFilter !== "all" && intervention.priority !== priorityFilter) {
      return false;
    }

    if (serviceFilter !== "all" && intervention.serviceId !== serviceFilter) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const haystack = [
      intervention.ticketNumber,
      intervention.title,
      intervention.description,
      intervention.requesterName,
      intervention.serviceName ?? "",
      intervention.categoryName ?? "",
      intervention.assignedToName ?? "",
      intervention.statusLabel,
      PRIORITY_LABELS[intervention.priority],
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });

  const sortedInterventions = [...filteredInterventions].sort((left, right) => {
    const leftValue =
      sortKey === "ticketNumber"
        ? left.ticketNumber
        : sortKey === "title"
          ? left.title
          : sortKey === "requester"
            ? left.requesterName
            : sortKey === "service"
              ? left.serviceName ?? ""
              : sortKey === "priority"
                ? PRIORITY_LABELS[left.priority]
                : sortKey === "category"
                  ? left.categoryName ?? ""
                  : left.statusLabel;

    const rightValue =
      sortKey === "ticketNumber"
        ? right.ticketNumber
        : sortKey === "title"
          ? right.title
          : sortKey === "requester"
            ? right.requesterName
            : sortKey === "service"
              ? right.serviceName ?? ""
              : sortKey === "priority"
                ? PRIORITY_LABELS[right.priority]
                : sortKey === "category"
                  ? right.categoryName ?? ""
                  : right.statusLabel;

    return sortDirection === "asc"
      ? leftValue.localeCompare(rightValue, "fr")
      : rightValue.localeCompare(leftValue, "fr");
  });

  const totalPages = Math.max(1, Math.ceil(sortedInterventions.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const paginatedInterventions = sortedInterventions.slice(pageStart, pageStart + pageSize);

  function handleSort(nextKey: SortKey) {
    setSortDirection((currentDirection) => toggleDirection(sortKey, currentDirection, nextKey));
    setSortKey(nextKey);
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setServiceFilter("all");
    setPage(1);
  }

  function renderSortButton(label: string, column: SortKey) {
    const isActive = sortKey === column;

    return (
      <button
        type="button"
        onClick={() => handleSort(column)}
        className="inline-flex items-center gap-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:text-foreground"
      >
        <span>{label}</span>
        <ArrowUpDown className={isActive ? "size-3.5 text-foreground" : "size-3.5"} />
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Rechercher un ticket, titre, demandeur ou categorie"
            className="pl-9"
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
          <SelectField
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">Tous les statuts</option>
            {statusOptions.map(([statusId, statusLabel]) => (
              <option key={statusId} value={statusId}>
                {statusLabel}
              </option>
            ))}
          </SelectField>

          <SelectField
            value={priorityFilter}
            onChange={(event) => {
              setPriorityFilter(event.target.value as "all" | Priority);
              setPage(1);
            }}
          >
            <option value="all">Toutes les priorites</option>
            {priorityOptions.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </SelectField>

          <SelectField
            value={serviceFilter}
            onChange={(event) => {
              setServiceFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">Tous les services</option>
            {serviceOptions.map(([serviceId, serviceName]) => (
              <option key={serviceId} value={serviceId}>
                {serviceName}
              </option>
            ))}
          </SelectField>

          <SelectField
            value={String(pageSize)}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option} par page
              </option>
            ))}
          </SelectField>

          <Button
            type="button"
            variant="outline"
            disabled={!hasActiveFilters}
            onClick={resetFilters}
          >
            Reinitialiser
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>
                {renderSortButton("Ticket", "ticketNumber")}
              </TableHead>
              <TableHead>
                {renderSortButton("Titre", "title")}
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                {renderSortButton("Demandeur", "requester")}
              </TableHead>
              <TableHead className="hidden xl:table-cell">
                {renderSortButton("Service", "service")}
              </TableHead>
              <TableHead className="hidden md:table-cell">
                {renderSortButton("Categorie", "category")}
              </TableHead>
              <TableHead className="hidden md:table-cell">
                {renderSortButton("Priorite", "priority")}
              </TableHead>
              <TableHead>
                {renderSortButton("Statut", "status")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedInterventions.length > 0 ? (
              paginatedInterventions.map((intervention) => (
                <TableRow key={intervention.id}>
                  <TableCell className="min-w-44">
                    <div className="space-y-3">
                      <Link
                        href={`/interventions/${intervention.id}`}
                        className="font-semibold text-foreground underline-offset-4 hover:underline"
                      >
                        {intervention.ticketNumber}
                      </Link>
                      <p className="text-xs text-muted">
                        {intervention.assignedToName ? `Affecte a ${intervention.assignedToName}` : "Aucune affectation"}
                      </p>
                      <Link
                        href={`/interventions/${intervention.id}`}
                        className={buttonVariants({
                          variant: "outline",
                          className: "w-full justify-center text-xs sm:w-auto",
                        })}
                      >
                        Voir le detail
                      </Link>
                    </div>
                  </TableCell>

                  <TableCell className="min-w-72">
                    <div className="space-y-2">
                      <p className="font-medium text-foreground">{intervention.title}</p>
                      <p className="line-clamp-2 text-sm text-muted">{intervention.description}</p>
                      <div className="flex flex-wrap gap-2 md:hidden">
                        <Badge variant="outline" className="w-fit">
                          {PRIORITY_LABELS[intervention.priority]}
                        </Badge>
                        <span className="text-xs text-muted">
                          {intervention.categoryName ?? "Non renseignee"}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="hidden min-w-44 text-sm text-foreground lg:table-cell">
                    {intervention.requesterName}
                  </TableCell>

                  <TableCell className="hidden min-w-40 text-sm text-foreground xl:table-cell">
                    {intervention.serviceName ?? "Sans service"}
                  </TableCell>

                  <TableCell className="hidden min-w-40 text-sm text-foreground md:table-cell">
                    {intervention.categoryName ?? "Non renseignee"}
                  </TableCell>

                  <TableCell className="hidden min-w-32 md:table-cell">
                    <Badge variant="outline" className="w-fit">
                      {PRIORITY_LABELS[intervention.priority]}
                    </Badge>
                  </TableCell>

                  <TableCell className="min-w-40">
                    <InterventionStatusBadge
                      label={intervention.statusLabel}
                      color={intervention.statusColor}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted">
                  Aucune intervention ne correspond aux filtres actuels.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-muted">
          {sortedInterventions.length} intervention{sortedInterventions.length > 1 ? "s" : ""} trouve
          {sortedInterventions.length > 1 ? "es" : "e"} · Page {safePage} sur {totalPages}
        </p>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={safePage === 1}
            onClick={() => setPage(1)}
          >
            <ChevronsLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={safePage === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={safePage === totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={safePage === totalPages}
            onClick={() => setPage(totalPages)}
          >
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
