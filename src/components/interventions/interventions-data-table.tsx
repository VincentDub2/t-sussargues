"use client";

import {
  ArrowUpDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
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
  location: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  priority: Priority;
  statusId: string;
  statusLabel: string;
  statusColor: string | null;
  requesterName: string;
  serviceId: string | null;
  serviceName: string | null;
  categoryName: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
};

type InterventionsDataTableProps = {
  interventions: InterventionRecord[];
  currentUserId: string;
};

type SortKey =
  | "ticketNumber"
  | "title"
  | "requester"
  | "location"
  | "service"
  | "priority"
  | "status"
  | "category"
  | "createdAt"
  | "updatedAt";
type SortDirection = "asc" | "desc";
type LifecycleFilter = "all" | "open" | "closed" | "assignedToMe" | "unassigned";

const pageSizeOptions = [10, 20, 50];
const priorityOptions: Priority[] = ["basse", "normale", "haute", "urgente"];

function toggleDirection(currentKey: SortKey, currentDirection: SortDirection, nextKey: SortKey) {
  if (currentKey !== nextKey) {
    return "asc";
  }

  return currentDirection === "asc" ? "desc" : "asc";
}

function formatDate(value: string | null) {
  if (!value) {
    return "Non renseignee";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getDateOnlyTime(value: string) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function getDateInputTime(value: string, endOfDay = false) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date.getTime();
}

export function InterventionsDataTable({
  interventions,
  currentUserId,
}: InterventionsDataTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const normalizedSearch = search.trim().toLowerCase();
  const activeAdvancedFiltersCount = [
    priorityFilter !== "all",
    serviceFilter !== "all",
    locationFilter !== "all",
    lifecycleFilter !== "all",
    Boolean(dateFrom),
    Boolean(dateTo),
    pageSize !== 10,
  ].filter(Boolean).length;
  const hasActiveFilters =
    Boolean(normalizedSearch) ||
    statusFilter !== "all" ||
    yearFilter !== "all" ||
    priorityFilter !== "all" ||
    serviceFilter !== "all" ||
    locationFilter !== "all" ||
    lifecycleFilter !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    pageSize !== 10;

  const statusOptions = Array.from(
    new Map(
      interventions.map((intervention) => [
        intervention.statusId,
        intervention.statusLabel,
      ])
    )
  ).sort(([, leftLabel], [, rightLabel]) => leftLabel.localeCompare(rightLabel, "fr"));

  const yearOptions = Array.from(
    new Set([
      new Date().getFullYear(),
      ...interventions.map((intervention) => new Date(intervention.createdAt).getFullYear()),
    ])
  ).sort((leftYear, rightYear) => rightYear - leftYear);

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

  const locationOptions = Array.from(
    new Set(
      interventions
        .map((intervention) => intervention.location)
        .filter((location): location is string => Boolean(location))
    )
  ).sort((leftLabel, rightLabel) => leftLabel.localeCompare(rightLabel, "fr"));

  const filteredInterventions = interventions.filter((intervention) => {
    if (statusFilter !== "all" && intervention.statusId !== statusFilter) {
      return false;
    }

    if (
      yearFilter !== "all" &&
      String(new Date(intervention.createdAt).getFullYear()) !== yearFilter
    ) {
      return false;
    }

    if (priorityFilter !== "all" && intervention.priority !== priorityFilter) {
      return false;
    }

    if (serviceFilter !== "all" && intervention.serviceId !== serviceFilter) {
      return false;
    }

    if (locationFilter !== "all" && intervention.location !== locationFilter) {
      return false;
    }

    if (lifecycleFilter === "open" && intervention.closedAt) {
      return false;
    }

    if (lifecycleFilter === "closed" && !intervention.closedAt) {
      return false;
    }

    if (lifecycleFilter === "assignedToMe" && intervention.assignedToId !== currentUserId) {
      return false;
    }

    if (lifecycleFilter === "unassigned" && intervention.assignedToId) {
      return false;
    }

    const createdAtTime = getDateOnlyTime(intervention.createdAt);
    const fromTime = dateFrom ? getDateInputTime(dateFrom) : null;
    const toTime = dateTo ? getDateInputTime(dateTo, true) : null;

    if (fromTime !== null && createdAtTime < fromTime) {
      return false;
    }

    if (toTime !== null && createdAtTime > toTime) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const haystack = [
      intervention.ticketNumber,
      intervention.title,
      intervention.description,
      intervention.location ?? "",
      formatDate(intervention.createdAt),
      formatDate(intervention.updatedAt),
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
    if (sortKey === "createdAt" || sortKey === "updatedAt") {
      const leftTime = new Date(left[sortKey]).getTime();
      const rightTime = new Date(right[sortKey]).getTime();

      return sortDirection === "asc" ? leftTime - rightTime : rightTime - leftTime;
    }

    const leftValue =
      sortKey === "ticketNumber"
        ? left.ticketNumber
        : sortKey === "title"
          ? left.title
          : sortKey === "requester"
            ? left.requesterName
            : sortKey === "location"
              ? left.location ?? ""
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
            : sortKey === "location"
              ? right.location ?? ""
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
    setYearFilter("all");
    setPriorityFilter("all");
    setServiceFilter("all");
    setLocationFilter("all");
    setLifecycleFilter("all");
    setDateFrom("");
    setDateTo("");
    setPageSize(10);
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
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Rechercher un ticket, titre, lieu ou categorie"
              className="pl-9"
            />
          </div>

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
            value={yearFilter}
            onChange={(event) => {
              setYearFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">Toutes les annees</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </SelectField>

          <Button
            type="button"
            variant="outline"
            onClick={() => setAdvancedFiltersOpen((isOpen) => !isOpen)}
            className="justify-center gap-2"
            aria-expanded={advancedFiltersOpen}
          >
            <SlidersHorizontal className="size-4" />
            <span>
              Filtres avances
              {activeAdvancedFiltersCount > 0 ? ` (${activeAdvancedFiltersCount})` : ""}
            </span>
            <ChevronDown
              className={
                advancedFiltersOpen
                  ? "size-4 rotate-180 transition-transform"
                  : "size-4 transition-transform"
              }
            />
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={!hasActiveFilters}
            onClick={resetFilters}
          >
            Reinitialiser
          </Button>
        </div>

        {advancedFiltersOpen ? (
          <div className="rounded-lg border border-border bg-secondary p-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                value={locationFilter}
                onChange={(event) => {
                  setLocationFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Tous les lieux</option>
                {locationOptions.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </SelectField>

              <SelectField
                value={lifecycleFilter}
                onChange={(event) => {
                  setLifecycleFilter(event.target.value as LifecycleFilter);
                  setPage(1);
                }}
              >
                <option value="all">Toutes les interventions</option>
                <option value="open">Ouvertes</option>
                <option value="closed">Cloturees</option>
                <option value="assignedToMe">Assignees a moi</option>
                <option value="unassigned">Non assignees</option>
              </SelectField>

              <div className="space-y-1">
                <label htmlFor="dateFrom" className="text-xs font-medium text-muted">
                  Creee apres le
                </label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(event) => {
                    setDateFrom(event.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="dateTo" className="text-xs font-medium text-muted">
                  Creee avant le
                </label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(event) => {
                    setDateTo(event.target.value);
                    setPage(1);
                  }}
                />
              </div>

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
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{renderSortButton("Ticket", "ticketNumber")}</TableHead>
              <TableHead>{renderSortButton("Titre", "title")}</TableHead>
              <TableHead className="hidden lg:table-cell">
                {renderSortButton("Demandeur", "requester")}
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                {renderSortButton("Lieu", "location")}
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
              <TableHead className="hidden xl:table-cell">
                {renderSortButton("Date", "createdAt")}
              </TableHead>
              <TableHead>{renderSortButton("Statut", "status")}</TableHead>
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
                        {intervention.assignedToName
                          ? `Affecte a ${intervention.assignedToName}`
                          : "Aucune affectation"}
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
                          {intervention.location ?? "Lieu non renseigne"}
                        </span>
                        <span className="text-xs text-muted">
                          {intervention.categoryName ?? "Non renseignee"}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="hidden min-w-44 text-sm text-foreground lg:table-cell">
                    {intervention.requesterName}
                  </TableCell>

                  <TableCell className="hidden min-w-44 text-sm text-foreground lg:table-cell">
                    {intervention.location ?? "Non renseigne"}
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

                  <TableCell className="hidden min-w-36 text-sm text-foreground xl:table-cell">
                    <div className="space-y-1">
                      <p>{formatDate(intervention.createdAt)}</p>
                      <p className="text-xs text-muted">
                        Maj {formatDate(intervention.updatedAt)}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell className="min-w-40">
                    <div className="space-y-2">
                      <InterventionStatusBadge
                        label={intervention.statusLabel}
                        color={intervention.statusColor}
                      />
                      <p className="text-xs text-muted">
                        {intervention.closedAt
                          ? `Cloturee le ${formatDate(intervention.closedAt)}`
                          : "Ouverte"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted">
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
