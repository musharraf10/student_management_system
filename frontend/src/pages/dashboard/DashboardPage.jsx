import { useAuth } from '../../context/AuthContext';
import SuperAdminDashboard from '../../components/dashboard/SuperAdminDashboard';
import CoachDashboard from '../../components/dashboard/CoachDashboard';

export default function DashboardPage() {
  const { isSuperAdmin } = useAuth();

  return isSuperAdmin ? <SuperAdminDashboard /> : <CoachDashboard />;
}
