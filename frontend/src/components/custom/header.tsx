import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useMsal } from "@azure/msal-react";
import { LogOut } from "lucide-react";
import React from "react";

interface HeaderProps {
  children?: React.ReactNode;
  rightSection?: React.ReactNode;
}

export const Header = ({ children, rightSection }: HeaderProps) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { instance } = useMsal();

  const handleLogout = async () => {
    const isAzureADSession = localStorage.getItem("auth_source") === "azure_ad";
    
    // Set logging out state to prevent auth attempts
    localStorage.setItem("loggingOut", "true");
    
    // Clear our app's auth state first
    logout();
    
    // Navigate to login immediately
    navigate("/login");
    
    // If it's an Azure session, clean up MSAL state silently
    if (isAzureADSession && instance) {
      try {
        // Just clear the account without redirecting
        const accounts = instance.getAllAccounts();
        accounts.forEach(account => {
          instance.clearCache({
            account
          });
        });
      } catch (error) {
        console.error("Error clearing MSAL state:", error);
      }
    }
    
    // Clear the logging out state after a short delay
    setTimeout(() => {
      localStorage.removeItem("loggingOut");
    }, 1000);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {children}
          <span className="text-lg font-semibold">Student Whisperer</span>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-full"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
          {rightSection}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};