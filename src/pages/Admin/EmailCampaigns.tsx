import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function EmailCampaigns() {
  const { user } = useAuth();
  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return (
    <div>
      <h1>Email Campaigns</h1>
      {/* Add content for managing email campaigns here */}
    </div>
  );
} 