import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Webhook, CreateWebhookData, UpdateWebhookData, WEBHOOK_EVENTS, WEBHOOK_EVENT_LABELS } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const API_URL = process.env.REACT_APP_API_URL || '/api';

const webhookSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  url: z.string().url("URL deve ser válida"),
  events: z.array(z.string()).min(1, "Selecione pelo menos um evento"),
  is_active: z.boolean().default(true),
  secret_key: z.string().optional(),
});

type WebhookFormData = z.infer<typeof webhookSchema>;

interface CreateWebhookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: Webhook;
  isEdit?: boolean;
}

export function CreateWebhookModal({
  open,
  onOpenChange,
  onSuccess,
  initialData,
  isEdit = false,
}: CreateWebhookModalProps) {
  const queryClient = useQueryClient();
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<WebhookFormData>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      name: "",
      url: "",
      events: [],
      is_active: true,
      secret_key: "",
    },
  });

  const isActive = watch("is_active");

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData && isEdit) {
        setValue("name", initialData.name);
        setValue("url", initialData.url);
        setValue("events", initialData.events);
        setValue("is_active", initialData.is_active);
        setValue("secret_key", initialData.secret_key || "");
        setSelectedEvents(Array.isArray(initialData.events) ? initialData.events : []);
      } else {
        reset();
        setSelectedEvents([]);
      }
    }
  }, [open, initialData, isEdit, setValue, reset]);

  // Sincronizar selectedEvents com o campo 'events' do formulário
  useEffect(() => {
    setValue("events", selectedEvents, { shouldValidate: true });
  }, [selectedEvents, setValue]);

  const createWebhookMutation = useMutation({
    mutationFn: async (data: CreateWebhookData) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/webhooks`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Webhook criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao criar webhook');
    }
  });

  const updateWebhookMutation = useMutation({
    mutationFn: async (data: UpdateWebhookData) => {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/webhooks/${initialData?.id}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Webhook atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar webhook');
    }
  });

  const onSubmit = (data: WebhookFormData) => {
    const webhookData = {
      ...data,
      events: selectedEvents,
    };

    if (isEdit && initialData) {
      updateWebhookMutation.mutate(webhookData);
    } else {
      createWebhookMutation.mutate(webhookData);
    }
  };

  const handleEventToggle = (event: string) => {
    setSelectedEvents(prev => {
      const currentEvents = Array.isArray(prev) ? prev : [];
      if (currentEvents.includes(event)) {
        return currentEvents.filter(e => e !== event);
      } else {
        return [...currentEvents, event];
      }
    });
  };

  const handleSelectAllEvents = () => {
    const allEvents = Object.values(WEBHOOK_EVENTS).filter(Boolean);
    setSelectedEvents(allEvents);
  };

  const handleClearAllEvents = () => {
    setSelectedEvents([]);
  };

  const eventCategories = {
    'Usuários': [
      WEBHOOK_EVENTS.USER_CREATED,
      WEBHOOK_EVENTS.USER_UPDATED,
      WEBHOOK_EVENTS.USER_DELETED,
    ],
    'Cursos': [
      WEBHOOK_EVENTS.COURSE_CREATED,
      WEBHOOK_EVENTS.COURSE_UPDATED,
      WEBHOOK_EVENTS.COURSE_DELETED,
      WEBHOOK_EVENTS.ENROLLMENT_CREATED,
      WEBHOOK_EVENTS.ENROLLMENT_COMPLETED,
    ],
    'Conteúdo': [
      WEBHOOK_EVENTS.POST_CREATED,
      WEBHOOK_EVENTS.POST_UPDATED,
      WEBHOOK_EVENTS.POST_DELETED,
      WEBHOOK_EVENTS.COMMENT_CREATED,
      WEBHOOK_EVENTS.COMMENT_UPDATED,
      WEBHOOK_EVENTS.COMMENT_DELETED,
      WEBHOOK_EVENTS.LESSON_COMPLETED,
    ],
    'Comentários de Aulas': [
      WEBHOOK_EVENTS.LESSON_COMMENT_CREATED,
      WEBHOOK_EVENTS.LESSON_COMMENT_UPDATED,
      WEBHOOK_EVENTS.LESSON_COMMENT_DELETED,
    ],
    'Respostas do Fórum': [
      WEBHOOK_EVENTS.FORUM_REPLY_CREATED,
      WEBHOOK_EVENTS.FORUM_REPLY_UPDATED,
      WEBHOOK_EVENTS.FORUM_REPLY_DELETED,
    ],
    'Turmas': [
      WEBHOOK_EVENTS.CLASS_CREATED,
      WEBHOOK_EVENTS.CLASS_UPDATED,
      WEBHOOK_EVENTS.CLASS_DELETED,
    ],
    // 'Avaliações': [ // Comentado - eventos não implementados
    //   WEBHOOK_EVENTS.RATING_CREATED,
    //   WEBHOOK_EVENTS.RATING_UPDATED,
    // ],
    'Sistema': [
      WEBHOOK_EVENTS.NOTIFICATION_CREATED,
    ],
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Webhook' : 'Criar Novo Webhook'}
          </DialogTitle>
          <DialogDescription>
            Configure um webhook para receber notificações de eventos do sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Webhook</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Ex: Notificações de Usuários"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL do Webhook</Label>
              <Input
                id="url"
                {...register("url")}
                placeholder="https://api.exemplo.com/webhook"
              />
              {errors.url && (
                <p className="text-sm text-destructive">{errors.url.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret_key">Chave Secreta (Opcional)</Label>
            <Input
              id="secret_key"
              {...register("secret_key")}
              placeholder="Chave para assinar as requisições"
            />
            <p className="text-sm text-muted-foreground">
              Esta chave será usada para assinar as requisições enviadas para o webhook.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch
                checked={isActive}
                onCheckedChange={(checked) => setValue("is_active", checked)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Webhooks inativos não receberão notificações.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Eventos</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllEvents}
                >
                  Selecionar Todos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearAllEvents}
                >
                  Limpar Todos
                </Button>
              </div>
            </div>

            {Array.isArray(selectedEvents) && selectedEvents.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedEvents.map((event) => (
                  <Badge key={event} variant="secondary">
                    {WEBHOOK_EVENT_LABELS[event as keyof typeof WEBHOOK_EVENT_LABELS] || event}
                  </Badge>
                ))}
              </div>
            )}

            {errors.events && (
              <p className="text-sm text-destructive">{errors.events.message}</p>
            )}

            <ScrollArea className="h-64 border rounded-md p-4">
              <div className="space-y-4">
                {Object.entries(eventCategories).map(([category, events]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="font-medium text-sm">{category}</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {Array.isArray(events) && events.filter(Boolean).map((event) => (
                        <div key={event} className="flex items-center space-x-2">
                          <Checkbox
                            id={event}
                            checked={Array.isArray(selectedEvents) && selectedEvents.includes(event)}
                            onCheckedChange={() => handleEventToggle(event)}
                          />
                          <Label
                            htmlFor={event}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {WEBHOOK_EVENT_LABELS[event as keyof typeof WEBHOOK_EVENT_LABELS] || event}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createWebhookMutation.isPending || updateWebhookMutation.isPending}
            >
              {isSubmitting || createWebhookMutation.isPending || updateWebhookMutation.isPending
                ? 'Salvando...'
                : isEdit
                ? 'Atualizar Webhook'
                : 'Criar Webhook'
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 