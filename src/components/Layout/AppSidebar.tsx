import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Home, MessageSquare, BookOpen, Search, Settings, User, LogOut, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const menuItems = [
  {
    title: "Home",
    url: "/",
    icon: Home,
    roles: ['student', 'instructor', 'admin']
  },
  {
    title: "Comunidade",
    url: "/community",
    icon: MessageSquare,
    roles: ['student', 'instructor', 'admin']
  },
  {
    title: "Meus Cursos",
    url: "/courses",
    icon: BookOpen,
    roles: ['student', 'instructor', 'admin']
  },
  {
    title: "Turmas",
    url: "/classes",
    icon: Users,
    roles: ['instructor', 'admin']
  },
  {
    title: "Explorar",
    url: "/explore",
    icon: Search,
    roles: ['student', 'instructor', 'admin']
  },
  {
    title: "Perfil",
    url: "/profile",
    icon: User,
    roles: ['student', 'instructor', 'admin']
  }
];

const adminItems = [
  {
    title: "Administração",
    url: "/admin",
    icon: Settings,
    roles: ['admin']
  }
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Log para debug
  console.log('AppSidebar - Current user:', user);
  console.log('AppSidebar - User role:', user?.role);

  const filteredMenuItems = menuItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  const filteredAdminItems = adminItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  console.log('AppSidebar - Filtered menu items:', filteredMenuItems.map(i => i.title));
  console.log('AppSidebar - Filtered admin items:', filteredAdminItems.map(i => i.title));

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-brand-blue rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg gradient-text">EduCommunity</h1>
            <p className="text-xs text-muted-foreground">Aprenda & Compartilhe</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.url}
                    className="w-full"
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {filteredAdminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location.pathname === item.url || (item.url === '/admin' && location.pathname.startsWith('/admin/'))}
                    >
                      <Link to={item.url} className="flex items-center gap-3">
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        {user && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent">
              <img 
                src={user.avatar_url || 'https://api.dicebear.com/8.x/initials/svg?seed=' + user.email} 
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user.role} {user.role === 'admin' && '(Admin)'}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={logout}
              className="w-full justify-start gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
