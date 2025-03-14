import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

interface AuthenticatedRouteProps {
  children: ReactNode;
}

/**
 * Route component that redirects authenticated users away from login/register pages
 */
export const AuthenticatedRoute = ({ children }: AuthenticatedRouteProps) => {
  const { isAuthenticated, loading, user } = useAuth();

  // Show nothing while checking authentication status
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If already authenticated, redirect to the appropriate page
  if (isAuthenticated) {
    // Redirect admin users to admin panel, others to chat
    if (user && user.student_id === 1) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/chat" replace />;
  }

  // Not authenticated, render login/register page
  return <>{children}</>;
};
