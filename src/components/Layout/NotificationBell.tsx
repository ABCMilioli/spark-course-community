import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Trash2, Square, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { Notification } from '@/types';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_API_URL || '/api';

export function NotificationBell() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications, error: notificationsError, isLoading: notificationsLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      console.log('🔔 Carregando notificações...');
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('❌ Token não encontrado');
        throw new Error('Token não encontrado');
      }
      
      try {
        const response = await axios.get(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
        console.log('✅ Notificações carregadas:', response.data);
        return response.data as Notification[];
      } catch (error) {
        console.error('❌ Erro ao carregar notificações:', error);
        throw error;
      }
    },
    enabled: !!user,
    refetchInterval: 30000, // Atualizar a cada 30 segundos
    retry: 3
  });

  const { data: notificationCount, error: countError, isLoading: countLoading } = useQuery({
    queryKey: ['notification-count'],
    queryFn: async () => {
      console.log('🔢 Carregando contador de notificações...');
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('❌ Token não encontrado para contador');
        throw new Error('Token não encontrado');
      }
      
      try {
        const response = await axios.get(`${API_URL}/notifications/count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
        console.log('✅ Contador carregado:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ Erro ao carregar contador:', error);
        throw error;
      }
    },
    enabled: !!user,
    refetchInterval: 30000,
    retry: 3
  });

  // Debug logs
  useEffect(() => {
    console.log('🔔 NotificationBell - Estado atual:', {
      user: user?.name,
      notifications: notifications?.length,
      unreadCount: notificationCount?.unread_count,
      notificationsError,
      countError,
      notificationsLoading,
      countLoading
    });
  }, [user, notifications, notificationCount, notificationsError, countError, notificationsLoading, countLoading]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Agora mesmo';
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return '💬';
      case 'reply':
      case 'forum_reply':
        return '↩️';
      case 'like':
        return '❤️';
      case 'system':
        return '🔔';
      case 'forum_new_post':
        return '📝';
      default:
        return '📢';
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Atualizar cache das notificações
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      toast.error('Erro ao marcar notificação como lida');
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Atualizar cache das notificações
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
      
      toast.success('Todas as notificações foram marcadas como lidas');
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
      toast.error('Erro ao marcar notificações como lidas');
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Se está no modo de seleção, não fazer navegação
    if (isSelectionMode) return;
    
    try {
      const token = localStorage.getItem('token');
      
      // Se tem referência, usar navegação inteligente
      if (notification.reference_id && notification.reference_type) {
        const { data } = await axios.get(`${API_URL}/notifications/${notification.id}/navigate`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        navigate(data.url);
      } else {
        // Apenas marcar como lida se não tem referência
        if (!notification.is_read) {
          await markAsRead(notification.id);
        }
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Erro ao navegar pela notificação:', error);
      toast.error('Erro ao abrir notificação');
      setIsOpen(false);
    }
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedNotifications([]);
  };

  const toggleNotificationSelection = (notificationId: string) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const toggleSelectAll = () => {
    if (!notifications) return;
    
    const allIds = notifications.map(n => n.id);
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(allIds);
    }
  };

  const deleteSelectedNotifications = async () => {
    if (selectedNotifications.length === 0) return;
    
    try {
      const token = localStorage.getItem('token');
      
      if (selectedNotifications.length === 1) {
        // Deletar uma notificação
        await axios.delete(`${API_URL}/notifications/${selectedNotifications[0]}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // Deletar múltiplas notificações
        await axios.delete(`${API_URL}/notifications`, {
          data: { notificationIds: selectedNotifications },
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      // Atualizar cache
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
      
      toast.success(`${selectedNotifications.length} notificação${selectedNotifications.length > 1 ? 'ões deletadas' : ' deletada'}`);
      
      // Sair do modo de seleção
      setSelectedNotifications([]);
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Erro ao deletar notificações:', error);
      toast.error('Erro ao deletar notificações');
    }
  };

  const deleteAllNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.delete(`${API_URL}/notifications/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Atualizar cache
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
      
      toast.success(`${data.deletedCount} notificações deletadas`);
      
      // Sair do modo de seleção
      setSelectedNotifications([]);
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Erro ao deletar todas as notificações:', error);
      toast.error('Erro ao deletar notificações');
    }
  };

  if (!user) return null;

  // Mostrar badge mesmo se está carregando e há erro, para debug
  const showBadge = (notificationCount?.unread_count > 0) || countLoading || countError;
  const badgeText = countLoading ? '...' : countError ? '!' : (notificationCount?.unread_count > 9 ? '9+' : notificationCount?.unread_count);

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        // Limpar seleção quando fechar
        setIsSelectionMode(false);
        setSelectedNotifications([]);
      }
    }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className={`w-5 h-5 ${countLoading ? 'animate-pulse' : ''}`} />
          {showBadge && (
            <Badge 
              variant={countError ? "secondary" : "destructive"}
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center font-bold border-2 border-background"
            >
              {badgeText}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
          <h4 className="font-semibold">Notificações</h4>
              {isSelectionMode && notifications && (
                <p className="text-sm text-muted-foreground">
                  {selectedNotifications.length} de {notifications.length} selecionada{selectedNotifications.length !== 1 ? 's' : ''}
                </p>
              )}
              {!isSelectionMode && notificationCount?.unread_count > 0 && (
            <p className="text-sm text-muted-foreground">
              {notificationCount.unread_count} não lida{notificationCount.unread_count > 1 ? 's' : ''}
            </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isSelectionMode ? (
                <>
                  {selectedNotifications.length > 0 && (
                                         <Button
                       variant="ghost"
                       size="sm"
                       onClick={deleteSelectedNotifications}
                       className="text-xs text-red-600 hover:text-red-700"
                     >
                       <Trash2 className="w-3 h-3 mr-1" />
                       Deletar ({selectedNotifications.length})
                     </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectionMode}
                    className="text-xs"
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  {notifications && notifications.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleSelectionMode}
                      className="text-xs"
                    >
                      <Square className="w-3 h-3 mr-1" />
                      Selecionar
                    </Button>
                  )}
                  {notificationCount?.unread_count > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs"
                    >
                      <CheckCheck className="w-3 h-3 mr-1" />
                      Marcar todas
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
          {isSelectionMode && notifications && notifications.length > 0 && (
            <div className="flex items-center justify-center mt-3 pt-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                className="text-xs"
              >
                {selectedNotifications.length === notifications.length ? (
                  <>
                    <CheckSquare className="w-3 h-3 mr-1" />
                    Desmarcar todas
                  </>
                ) : (
                  <>
                    <Square className="w-3 h-3 mr-1" />
                    Selecionar todas
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
        <ScrollArea className="h-80">
          <div className="p-2">
            {notificationsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50 animate-pulse" />
                <p className="text-sm">Carregando notificações...</p>
              </div>
            ) : notificationsError ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50 text-red-500" />
                <p className="text-sm text-red-500">Erro ao carregar notificações</p>
                <p className="text-xs mt-1">Verifique o console para detalhes</p>
              </div>
            ) : !notifications || notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications?.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      isSelectionMode 
                        ? selectedNotifications.includes(notification.id)
                        ? 'bg-blue-50 border-blue-200' 
                          : 'hover:bg-muted/50 cursor-pointer'
                        : !notification.is_read 
                          ? 'bg-blue-50 border-blue-200 cursor-pointer' 
                          : 'hover:bg-muted/50 cursor-pointer'
                    }`}
                    onClick={() => 
                      isSelectionMode 
                        ? toggleNotificationSelection(notification.id)
                        : handleNotificationClick(notification)
                    }
                  >
                    <div className="flex items-start gap-3">
                      {isSelectionMode && (
                        <Checkbox
                          checked={selectedNotifications.includes(notification.id)}
                          onCheckedChange={() => toggleNotificationSelection(notification.id)}
                          className="mt-1"
                        />
                      )}
                      <span className="text-lg">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>
                      {!notification.is_read && !isSelectionMode && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
} 