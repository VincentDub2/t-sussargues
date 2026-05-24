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

import type { Priority, PurchaseStatus } from "@/generated/prisma/client";
import { PRIORITY_LABELS, PURCHASE_STATUS_LABELS } from "@/lib/labels";
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

import { PurchaseStatusBadge } from "./purchase-status-badge";

type PurchaseRecord = {
  id: string;
  requestNumber: string;
  title: string;
  description: string;
  priority: Priority;
  status: PurchaseStatus;
  estimatedBudget: string | null;
  requesterName: string;
  serviceName: string | null;
};

type PurchasesDataTableProps = {
  purchases: PurchaseRecord[];
};

type SortKey = "requestNumber" | "title" | "requester" | "service" | "priority" | "status";
type SortDirection = "asc" | "desc";

const pageSizeOptions = [10, 20, 50];

function formatBudget(value: string | null) {
  if (!value) {
    return "Non renseigne";
  }

  return `${Number(value).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} EUR`;
}

function toggleDirection(currentKey: SortKey, currentDirection: SortDirection, nextKey: SortKey) {
  if (currentKey !== nextKey) {
    return "asc";
  }

  return currentDirection === "asc" ? "desc" : "asc";
}

function SortButton({
  label,
  column,
  isActive,
  onSort,
}: {
  label: string;
  column: SortKey;
  isActive: boolean;
  onSort: (column: SortKey) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="inline-flex items-center gap-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:text-foreground"
    >
      <span>{label}</span>
      <ArrowUpDown className={isActive ? "size-3.5 text-foreground" : "size-3.5"} />
    </button>
  );
}

export function PurchasesDataTable({ purchases }: PurchasesDataTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PurchaseStatus>("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("requestNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const normalizedSearch = search.trim().toLowerCase();

  const filteredPurchases = purchases.filter((purchase) => {
    if (statusFilter !== "all" && purchase.status !== statusFilter) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const haystack = [
      purchase.requestNumber,
      purchase.title,
      purchase.description,
      purchase.requesterName,
      purchase.serviceName ?? "",
      PRIORITY_LABELS[purchase.priority],
      PURCHASE_STATUS_LABELS[purchase.status],
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });

  const sortedPurchases = [...filteredPurchases].sort((left, right) => {
    const leftValue =
      sortKey === "requestNumber"
        ? left.requestNumber
        : sortKey === "title"
          ? left.title
          : sortKey === "requester"
            ? left.requesterName
            : sortKey === "service"
              ? left.serviceName ?? ""
              : sortKey === "priority"
                ? PRIORITY_LABELS[left.priority]
                : PURCHASE_STATUS_LABELS[left.status];

    const rightValue =
      sortKey === "requestNumber"
        ? right.requestNumber
        : sortKey === "title"
          ? right.title
          : sortKey === "requester"
            ? right.requesterName
            : sortKey === "service"
              ? right.serviceName ?? ""
              : sortKey === "priority"
                ? PRIORITY_LABELS[right.priority]
                : PURCHASE_STATUS_LABELS[right.status];

    return sortDirection === "asc"
      ? leftValue.localeCompare(rightValue, "fr")
      : rightValue.localeCompare(leftValue, "fr");
  });

  const totalPages = Math.max(1, Math.ceil(sortedPurchases.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const paginatedPurchases = sortedPurchases.slice(pageStart, pageStart + pageSize);

  function handleSort(nextKey: SortKey) {
    setSortDirection((currentDirection) => toggleDirection(sortKey, currentDirection, nextKey));
    setSortKey(nextKey);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Rechercher un numero, titre, demandeur ou service"
            className="pl-9"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SelectField
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as "all" | PurchaseStatus);
              setPage(1);
            }}
            className="sm:w-52"
          >
            <option value="all">Tous les statuts</option>
            <option value="brouillon">{PURCHASE_STATUS_LABELS.brouillon}</option>
            <option value="soumise">{PURCHASE_STATUS_LABELS.soumise}</option>
            <option value="en_validation">{PURCHASE_STATUS_LABELS.en_validation}</option>
            <option value="informations_demandees">
              {PURCHASE_STATUS_LABELS.informations_demandees}
            </option>
            <option value="validee">{PURCHASE_STATUS_LABELS.validee}</option>
            <option value="refusee">{PURCHASE_STATUS_LABELS.refusee}</option>
            <option value="en_commande">{PURCHASE_STATUS_LABELS.en_commande}</option>
            <option value="receptionnee">{PURCHASE_STATUS_LABELS.receptionnee}</option>
            <option value="cloturee">{PURCHASE_STATUS_LABELS.cloturee}</option>
          </SelectField>

          <SelectField
            value={String(pageSize)}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            className="sm:w-40"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option} par page
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>
                <SortButton
                  label="Demande"
                  column="requestNumber"
                  isActive={sortKey === "requestNumber"}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortButton
                  label="Titre"
                  column="title"
                  isActive={sortKey === "title"}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                <SortButton
                  label="Demandeur"
                  column="requester"
                  isActive={sortKey === "requester"}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="hidden xl:table-cell">
                <SortButton
                  label="Service"
                  column="service"
                  isActive={sortKey === "service"}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <SortButton
                  label="Priorite"
                  column="priority"
                  isActive={sortKey === "priority"}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortButton
                  label="Statut"
                  column="status"
                  isActive={sortKey === "status"}
                  onSort={handleSort}
                />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPurchases.length > 0 ? (
              paginatedPurchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell className="min-w-44">
                    <div className="space-y-3">
                      <Link
                        href={`/achats/${purchase.id}`}
                        className="font-semibold text-foreground underline-offset-4 hover:underline"
                      >
                        {purchase.requestNumber}
                      </Link>
                      <p className="text-xs text-muted">{formatBudget(purchase.estimatedBudget)}</p>
                      <Link
                        href={`/achats/${purchase.id}`}
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
                      <p className="font-medium text-foreground">{purchase.title}</p>
                      <p className="line-clamp-2 text-sm text-muted">{purchase.description}</p>
                      <div className="flex flex-wrap gap-2 md:hidden">
                        <Badge variant="outline" className="w-fit">
                          {PRIORITY_LABELS[purchase.priority]}
                        </Badge>
                        <span className="text-xs text-muted">
                          {purchase.serviceName ?? "Sans service"}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="hidden min-w-44 text-sm text-foreground lg:table-cell">
                    {purchase.requesterName}
                  </TableCell>

                  <TableCell className="hidden min-w-40 text-sm text-foreground xl:table-cell">
                    {purchase.serviceName ?? "Sans service"}
                  </TableCell>

                  <TableCell className="hidden min-w-32 md:table-cell">
                    <Badge variant="outline" className="w-fit">
                      {PRIORITY_LABELS[purchase.priority]}
                    </Badge>
                  </TableCell>

                  <TableCell className="min-w-40">
                    <PurchaseStatusBadge status={purchase.status} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted">
                  Aucune demande d&apos;achat ne correspond aux filtres actuels.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-muted">
          {sortedPurchases.length} demande{sortedPurchases.length > 1 ? "s" : ""} trouve
          {sortedPurchases.length > 1 ? "es" : "e"} · Page {safePage} sur {totalPages}
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
