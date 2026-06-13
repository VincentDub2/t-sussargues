import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type NotificationLogRow = {
  id: string;
  event: string;
  recipient: string;
  subject: string;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
};

type NotificationLogsTableProps = {
  logs: NotificationLogRow[];
  emptyMessage: string;
};

export function NotificationLogsTable({
  logs,
  emptyMessage,
}: NotificationLogsTableProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-secondary p-4 text-sm text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Destinataire</TableHead>
          <TableHead>Evenement</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Sujet</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="whitespace-nowrap text-xs text-muted">
              {log.createdAt.toLocaleString("fr-FR")}
            </TableCell>
            <TableCell>
              <p className="font-medium text-foreground">{log.recipient}</p>
              {log.errorMessage ? (
                <p className="mt-1 max-w-md truncate font-mono text-xs text-danger">
                  {log.errorMessage}
                </p>
              ) : null}
            </TableCell>
            <TableCell>
              <Badge variant="outline">{log.event}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{log.status}</Badge>
            </TableCell>
            <TableCell className="max-w-md">
              <p className="truncate text-sm text-muted">{log.subject}</p>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
