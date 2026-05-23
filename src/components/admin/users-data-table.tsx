"use client";

import {
  ArrowUpDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { useState } from "react";

import type { Role, UserStatus } from "@/generated/prisma/client";
import { ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/labels";
import { UserAdminRow } from "@/components/admin/user-admin-row";
import { Button } from "@/components/ui/button";
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

type UserRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  username: string;
  role: Role;
  status: UserStatus;
  isActive: boolean;
  serviceId: string | null;
  serviceName: string | null;
};

type UsersDataTableProps = {
  currentUserId: string;
  services: Array<{ id: string; name: string; isActive: boolean }>;
  users: UserRecord[];
};

type SortKey = "name" | "role" | "service" | "status";
type SortDirection = "asc" | "desc";

const pageSizeOptions = [10, 20, 50];

function toggleDirection(currentKey: SortKey, currentDirection: SortDirection, nextKey: SortKey) {
  if (currentKey !== nextKey) {
    return "asc";
  }

  return currentDirection === "asc" ? "desc" : "asc";
}

export function UsersDataTable({ currentUserId, services, users }: UsersDataTableProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const normalizedSearch = search.trim().toLowerCase();

  const filteredUsers = users.filter((user) => {
    if (roleFilter !== "all" && user.role !== roleFilter) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const haystack = [
      `${user.firstName} ${user.lastName}`,
      user.email ?? "",
      user.username,
      ROLE_LABELS[user.role],
      USER_STATUS_LABELS[user.status],
      user.serviceName ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });

  const sortedUsers = [...filteredUsers].sort((left, right) => {
    const leftValue =
      sortKey === "name"
        ? `${left.firstName} ${left.lastName}`
        : sortKey === "role"
          ? ROLE_LABELS[left.role]
          : sortKey === "service"
            ? left.serviceName ?? ""
            : USER_STATUS_LABELS[left.status];

    const rightValue =
      sortKey === "name"
        ? `${right.firstName} ${right.lastName}`
        : sortKey === "role"
          ? ROLE_LABELS[right.role]
          : sortKey === "service"
            ? right.serviceName ?? ""
            : USER_STATUS_LABELS[right.status];

    return sortDirection === "asc"
      ? leftValue.localeCompare(rightValue, "fr")
      : rightValue.localeCompare(leftValue, "fr");
  });

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const paginatedUsers = sortedUsers.slice(pageStart, pageStart + pageSize);

  function handleSort(nextKey: SortKey) {
    setSortDirection((currentDirection) => toggleDirection(sortKey, currentDirection, nextKey));
    setSortKey(nextKey);
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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Rechercher un nom, identifiant, email, role ou service"
            className="pl-9"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SelectField
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value as "all" | Role);
              setPage(1);
            }}
            className="sm:w-52"
          >
            <option value="all">Tous les roles</option>
            <option value="admin">{ROLE_LABELS.admin}</option>
            <option value="elu">{ROLE_LABELS.elu}</option>
            <option value="responsable_service">{ROLE_LABELS.responsable_service}</option>
            <option value="agent">{ROLE_LABELS.agent}</option>
            <option value="lecture">{ROLE_LABELS.lecture}</option>
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
                {renderSortButton("Utilisateur", "name")}
              </TableHead>
              <TableHead>
                {renderSortButton("Role", "role")}
              </TableHead>
              <TableHead>
                {renderSortButton("Service", "service")}
              </TableHead>
              <TableHead>
                {renderSortButton("Statut", "status")}
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.length > 0 ? (
              paginatedUsers.map((user) => (
                <UserAdminRow
                  key={user.id}
                  currentUserId={currentUserId}
                  services={services}
                  user={user}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted">
                  Aucun utilisateur ne correspond aux filtres actuels.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-muted">
          {sortedUsers.length} utilisateur{sortedUsers.length > 1 ? "s" : ""} trouve
          {sortedUsers.length > 1 ? "s" : ""} · Page {safePage} sur {totalPages}
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
