import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * Route component that restricts access to admin users only (student_id === 1)
 */
export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { isAuthenticated, loading, user } = useAuth();

  // Show loading indicator while checking authentication status
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // First check if user is authenticated at all
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Then check if user has admin privileges (student_id === 1)
  if (!user || user.student_id !== 1) {
    // User is authenticated but not an admin, redirect to chat
    return <Navigate to="/chat" replace />;
  }

  // User is authenticated and is an admin, grant access
  return <>{children}</>;
};
