import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "./NotificationBell";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function Header() {
  const { user, refreshUser } = useAuth();

  // Log para debug
  console.log('Header - Current user:', user);

  const handleRefreshUser = () => {
    refreshUser();
  };

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex items-center justify-between h-full px-3 sm:px-6">
        {/* Mobile Menu Trigger */}
        <SidebarTrigger className="mr-2 lg:hidden" />
        
        {/* Search Bar */}
        <div className="flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar posts, cursos, usuários..."
              className="pl-10 bg-muted/50 border-none focus:bg-background"
            />
          </div>
        </div>

        {/* Mobile Title & Search */}
        <div className="sm:hidden flex-1 flex items-center justify-between px-2">
          <h1 className="font-bold text-base gradient-text">EduCommunity</h1>
          <Button variant="ghost" size="sm">
            <Search className="w-5 h-5" />
          </Button>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-4">
          {user && (
            <>
              {/* Notifications */}
              <NotificationBell />

              {/* Messages - Escondido temporariamente (sem serviço de mensagem ativo) */}
              {/* 
              <Button variant="ghost" size="sm" className="relative">
                <MessageSquare className="w-5 h-5" />
                <Badge 
                  variant="secondary" 
                  className="absolute -top-1 -right-1 w-5 h-5 text-xs p-0 flex items-center justify-center"
                >
                  1
                </Badge>
              </Button>
              */}



              {/* Refresh Button (temporário para debug) */}
              <Button variant="outline" size="sm" onClick={handleRefreshUser} className="hidden sm:flex">
                Atualizar
              </Button>

              {/* User Info */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {user.role} {user.role === 'admin' && '(Admin)'}
                  </p>
                </div>
                <img 
                  src={user.avatar_url || 'https://api.dicebear.com/8.x/initials/svg?seed=' + user.email} 
                  alt={user.name}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover ring-2 ring-primary/20"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
