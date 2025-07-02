import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { 
  MessageCircle, 
  Search, 
  Plus, 
  ArrowLeft,
  Send,
  Paperclip,
  Smile,
  MoreVertical
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Conversation, Message, ConversationWithMessages } from '../types';
import { toast } from 'sonner';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface User {
  id: string;
  name: string;
  avatar_url: string;
  role: string;
}

const Messages: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId?: string }>();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithMessages | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Estados para nova conversa
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Estados para mensagens
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      setSelectedConversation(null);
    }
  }, [conversationId]);

  useEffect(() => {
    if (userSearch.trim()) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [userSearch]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/conversations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      } else {
        toast.error('Erro ao carregar conversas');
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      toast.error('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (id: string) => {
    try {
      setConversationLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/conversations/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedConversation(data);
      } else {
        toast.error('Erro ao carregar conversa');
        navigate('/messages');
      }
    } catch (error) {
      console.error('Erro ao carregar conversa:', error);
      toast.error('Erro ao carregar conversa');
    } finally {
      setConversationLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!userSearch.trim()) return;
    
    try {
      setSearchLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(userSearch)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const createDirectConversation = async (otherUserId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/conversations/direct', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ otherUserId })
      });

      if (response.ok) {
        const conversation = await response.json();
        setShowNewConversation(false);
        setUserSearch('');
        navigate(`/messages/${conversation.id}`);
        loadConversations(); // Recarregar lista
      } else {
        toast.error('Erro ao criar conversa');
      }
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
      toast.error('Erro ao criar conversa');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    try {
      setSendingMessage(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/conversations/${selectedConversation.conversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          reply_to_id: replyTo?.id || null
        })
      });

      if (response.ok) {
        const message = await response.json();
        setSelectedConversation(prev => ({
          ...prev!,
          messages: [...prev!.messages, message]
        }));
        setNewMessage('');
        setReplyTo(null);
        loadConversations(); // Atualizar lista com nova mensagem
      } else {
        toast.error('Erro ao enviar mensagem');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = parseISO(timestamp);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Ontem';
    } else {
      return format(date, 'dd/MM', { locale: ptBR });
    }
  };

  const getOtherParticipant = (conversation: Conversation) => {
    if (!user) return null;
    return conversation.participants?.find(p => p.user_id !== user.id);
  };

  const hasUnreadMessages = (conversation: Conversation) => {
    if (!conversation.last_message_at || !user) return false;
    const participant = conversation.participants?.find(p => p.user_id === user.id);
    if (!participant?.last_read_at) return true;
    return parseISO(conversation.last_message_at) > parseISO(participant.last_read_at);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 min-h-[calc(100vh-6rem)] lg:h-[calc(100vh-6rem)] flex flex-col lg:flex-row">
      {/* Lista de Conversas */}
             <Card className={`w-full lg:w-1/3 lg:mr-4 flex flex-col h-[60vh] lg:max-h-full bg-black border-gray-800 ${selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <MessageCircle className="h-5 w-5 text-white" />
              Mensagens
            </CardTitle>
            <Button 
              size="sm"
              onClick={() => setShowNewConversation(!showNewConversation)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {showNewConversation && (
            <div className="space-y-3 border-t border-gray-800 pt-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar usuários..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 focus:bg-gray-800"
                />
              </div>
              
              {searchLoading && (
                <div className="text-center py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              )}
              
              {searchResults.length > 0 && (
                <ScrollArea className="max-h-40">
                  {searchResults.map((searchUser) => (
                    <div 
                      key={searchUser.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-900 rounded cursor-pointer"
                      onClick={() => createDirectConversation(searchUser.id)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={searchUser.avatar_url} />
                        <AvatarFallback>{searchUser.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-white">{searchUser.name}</p>
                        <p className="text-xs text-gray-400">{searchUser.role}</p>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              )}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden p-0 min-h-0">
          <ScrollArea className="h-full">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                <p className="text-gray-400">Nenhuma conversa ainda</p>
                <p className="text-sm text-gray-500">Clique em + para iniciar uma conversa</p>
              </div>
            ) : (
              conversations.map((conversation) => {
                const otherParticipant = getOtherParticipant(conversation);
                const isSelected = conversationId === conversation.id;
                const unread = hasUnreadMessages(conversation);
                
                return (
                  <div
                    key={conversation.id}
                    className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-900 ${isSelected ? 'bg-gray-900 border-l-4 border-l-blue-500' : ''}`}
                    onClick={() => navigate(`/messages/${conversation.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={otherParticipant?.avatar_url} />
                        <AvatarFallback>{otherParticipant?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`font-medium truncate text-white ${unread ? 'font-semibold' : ''}`}>
                            {otherParticipant?.name || 'Usuário'}
                          </p>
                          {conversation.last_message_at && (
                            <span className="text-xs text-gray-400">
                              {formatMessageTime(conversation.last_message_at)}
                            </span>
                          )}
                        </div>
                        {conversation.last_message_content && (
                          <p className={`text-sm text-gray-300 truncate ${unread ? 'font-medium' : ''}`}>
                            {conversation.last_message_content}
                          </p>
                        )}
                      </div>
                      {unread && (
                        <Badge variant="default" className="bg-blue-500">
                          Nova
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Área da Conversa */}
             <Card className={`w-full lg:flex-1 flex flex-col h-[80vh] lg:max-h-full mt-4 lg:mt-0 ${!selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
        {!selectedConversation ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Selecione uma conversa
              </h3>
              <p className="text-gray-500">
                Escolha uma conversa na lista ou inicie uma nova
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header da Conversa */}
            <CardHeader className="flex-shrink-0 border-b">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="lg:hidden text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  onClick={() => navigate('/messages')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar>
                  <AvatarImage src={getOtherParticipant(selectedConversation.conversation)?.avatar_url} />
                  <AvatarFallback>
                    {getOtherParticipant(selectedConversation.conversation)?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-medium">
                    {getOtherParticipant(selectedConversation.conversation)?.name}
                  </h3>
                  <p className="text-sm text-gray-500">Online</p>
                </div>
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 hover:bg-gray-100">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            {/* Mensagens */}
            <CardContent className="flex-1 overflow-hidden p-0 min-h-0">
              {conversationLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <ScrollArea className="h-full p-4 pb-2">
                  {selectedConversation.messages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Nenhuma mensagem ainda</p>
                      <p className="text-sm">Seja o primeiro a enviar uma mensagem!</p>
                    </div>
                  ) : (
                    <div className="space-y-4 pb-4">
                      {selectedConversation.messages.map((message) => {
                        const isOwn = message.sender_id === user?.id;
                        
                        return (
                          <div 
                            key={message.id} 
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[85%] sm:max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                              {!isOwn && (
                                <div className="flex items-center gap-2 mb-1">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={message.sender_avatar_url} />
                                    <AvatarFallback>{message.sender_name?.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs font-medium">{message.sender_name}</span>
                                </div>
                              )}
                              
                              {message.reply_to_id && message.reply_to_content && (
                                <div className="bg-gray-200 border-l-4 border-gray-400 p-2 mb-2 rounded text-xs">
                                  <p className="text-gray-700 truncate font-medium">{message.reply_to_content}</p>
                                </div>
                              )}
                              
                              <div className={`p-3 rounded-lg ${
                                isOwn 
                                  ? 'bg-blue-500 text-white' 
                                  : 'bg-gray-700 text-white border border-gray-600 shadow-sm'
                              }`}>
                                <p className="text-sm font-medium">{message.content}</p>
                                <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-300'}`}>
                                  {formatMessageTime(message.created_at)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              )}
            </CardContent>

            {/* Input de Mensagem */}
            <div className="border-t border-gray-800 bg-black p-4 flex-shrink-0">
              {replyTo && (
                <div className="bg-gray-800 border-l-4 border-blue-500 p-2 mb-2 rounded flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-400">Respondendo a:</p>
                    <p className="text-sm text-gray-200 truncate">{replyTo.content}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setReplyTo(null)}
                    className="text-gray-400 hover:text-white hover:bg-gray-700"
                  >
                    ×
                  </Button>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-800">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    disabled={sendingMessage}
                    className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-400 focus:border-blue-500 focus:bg-gray-800"
                  />
                </div>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-800">
                  <Smile className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default Messages; 