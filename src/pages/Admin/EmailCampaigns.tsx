import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function EmailCampaigns() {
  const { user } = useAuth();
  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4">Campanhas de E-mail</h1>
      {/* Grid responsivo para cards/listas futuras */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Exemplo de card */}
        <div className="bg-card rounded-lg shadow p-4">
          <h2 className="font-semibold text-lg mb-2">Campanha Exemplo</h2>
          <p className="text-sm text-muted-foreground">Descrição da campanha...</p>
        </div>
        {/* ...outros cards futuros */}
      </div>
    </div>
  );
} 