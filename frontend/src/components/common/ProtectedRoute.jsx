import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
}) {
  const { isAuthenticated, loading, user, isSuperAdmin, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand-300 border-t-brand-700"></div>
          <p className="text-sm font-medium text-brand-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole && !isSuperAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 max-w-md">
          <h2 className="text-base font-semibold text-red-800">Access Restricted</h2>
          <p className="mt-2 text-sm text-red-600">
            You do not have administrative privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 max-w-md">
          <h2 className="text-base font-semibold text-amber-800">Permission Required</h2>
          <p className="mt-2 text-sm text-amber-700">
            You lack the &apos;{requiredPermission}&apos; permission. Please contact your Zonal Manager.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
