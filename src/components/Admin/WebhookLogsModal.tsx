import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Webhook, WebhookLog, WEBHOOK_EVENT_LABELS } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle, Clock, Eye } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const API_URL = process.env.REACT_APP_API_URL || '/api';

interface WebhookLogsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhook: Webhook;
}

export function WebhookLogsModal({
  open,
  onOpenChange,
  webhook,
}: WebhookLogsModalProps) {
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['webhook-logs', webhook.id],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/webhooks/${webhook.id}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
    enabled: open,
  });

  const getStatusIcon = (log: WebhookLog) => {
    if (log.is_success) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (log.response_status) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    } else {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusText = (log: WebhookLog) => {
    if (log.is_success) {
      return "Sucesso";
    } else if (log.response_status) {
      return `Erro ${log.response_status}`;
    } else {
      return "Pendente";
    }
  };

  const getStatusBadge = (log: WebhookLog) => {
    if (log.is_success) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Sucesso</Badge>;
    } else if (log.response_status) {
      return <Badge variant="destructive">Erro {log.response_status}</Badge>;
    } else {
      return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Logs do Webhook: {webhook.name}</DialogTitle>
          <DialogDescription>
            Histórico de tentativas de envio para {webhook.url}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : logs?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum log encontrado para este webhook.
            </div>
          ) : (
            <ScrollArea className="h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tentativas</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.map((log: WebhookLog) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {WEBHOOK_EVENT_LABELS[log.event_type as keyof typeof WEBHOOK_EVENT_LABELS] || log.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log)}
                          {getStatusBadge(log)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.attempt_count}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedLog(log)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ver detalhes</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>

        {/* Modal de detalhes do log */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Log</DialogTitle>
              <DialogDescription>
                Informações completas sobre a tentativa de envio
              </DialogDescription>
            </DialogHeader>

            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm">Evento</h4>
                    <p className="text-sm text-muted-foreground">
                      {WEBHOOK_EVENT_LABELS[selectedLog.event_type as keyof typeof WEBHOOK_EVENT_LABELS] || selectedLog.event_type}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Data/Hora</h4>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Status</h4>
                    <p className="text-sm text-muted-foreground">
                      {getStatusText(selectedLog)}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Tentativas</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedLog.attempt_count}
                    </p>
                  </div>
                </div>

                {selectedLog.response_status && (
                  <div>
                    <h4 className="font-medium text-sm">Status HTTP</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedLog.response_status}
                    </p>
                  </div>
                )}

                {selectedLog.error_message && (
                  <div>
                    <h4 className="font-medium text-sm">Mensagem de Erro</h4>
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {selectedLog.error_message}
                    </p>
                  </div>
                )}

                {selectedLog.response_body && (
                  <div>
                    <h4 className="font-medium text-sm">Resposta do Servidor</h4>
                    <ScrollArea className="h-32 border rounded-md p-2">
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {selectedLog.response_body}
                      </pre>
                    </ScrollArea>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-sm">Payload Enviado</h4>
                  <ScrollArea className="h-48 border rounded-md p-2">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.payload, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
} 