import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/Layout/AppSidebar";
import { Header } from "@/components/Layout/Header";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "@/components/Auth/LoginForm";
import Index from "./pages/Index";
import Community from "./pages/Community";
import Forum from "./pages/Forum";
import ForumTopic from "./pages/ForumTopic";
import ForumPostDetail from "./pages/ForumPostDetail";
import Courses from "./pages/Courses";
import VideoPlayer from "./pages/VideoPlayer";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import Explore from "./pages/Explore";
import CourseDetail from "./pages/CourseDetail";
import PostDetail from "./pages/PostDetail";
import NotFound from "./pages/NotFound";
import CourseAdmin from "./pages/CourseAdmin";
import Classes from "./pages/Classes";
import ClassDetail from "./pages/ClassDetail";
import ClassManagement from "./pages/ClassManagement";
import Payment from "./pages/Payment";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailure from "./pages/PaymentFailure";
import PaymentPending from "./pages/PaymentPending";
import PaymentManagement from "./pages/Admin/PaymentManagement";
import PublicProfile from "./pages/PublicProfile";
import Messages from "./pages/Messages";
import ResetPassword from "./pages/ResetPassword";
import { VerifyEmail } from "./pages/VerifyEmail";
import EmailCampaigns from "./pages/EmailCampaigns";

const queryClient = new QueryClient();

function AppContent() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Permitir acesso à tela de redefinição de senha e verificação de email mesmo sem login
  if (location.pathname.startsWith("/reset-password") || location.pathname.startsWith("/verify-email")) {
    if (location.pathname.startsWith("/reset-password")) {
      return <ResetPassword />;
    }
    if (location.pathname.startsWith("/verify-email")) {
      return <VerifyEmail />;
    }
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/community" element={<Community />} />
              <Route path="/forum" element={<Forum />} />
              <Route path="/forum/topic/:slug" element={<ForumTopic />} />
              <Route path="/forum/post/:postId" element={<ForumPostDetail />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/classes" element={<Classes />} />
              <Route path="/classes/:classId" element={<ClassDetail />} />
              <Route path="/classes/:classId/manage" element={<ClassManagement />} />
              <Route path="/course" element={<CourseDetail />} />
              <Route path="/course/:courseId" element={<CourseDetail />} />
              <Route path="/post/:postId" element={<PostDetail />} />
              <Route path="/player" element={<VideoPlayer />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/user/:userId" element={<PublicProfile />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/messages/:conversationId" element={<Messages />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/course/edit/:courseId" element={<CourseAdmin />} />
              <Route path="/admin/payments" element={<PaymentManagement />} />
              <Route path="/admin/email-campaigns" element={<EmailCampaigns />} />
              <Route path="/payment" element={<Payment />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/failure" element={<PaymentFailure />} />
              <Route path="/payment/pending" element={<PaymentPending />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
