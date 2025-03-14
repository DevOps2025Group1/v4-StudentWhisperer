import React, { useEffect, useCallback } from "react";
import { MsalProvider, useMsal, useIsAuthenticated } from "@azure/msal-react";
import {
  PublicClientApplication,
  EventType,
  AccountInfo,
} from "@azure/msal-browser";
import { msalConfig } from "../../config/msalConfig";
import { useAuth } from "../../context/AuthContext";
import { exchangeAzureToken } from "../../utils/azureAuth";
import { useNavigate } from "react-router-dom";

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

// Register event callbacks to track authentication state
msalInstance.addEventCallback((event) => {
  if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
    const account = event.payload as AccountInfo;
    msalInstance.setActiveAccount(account);
  }
});

interface MsalAuthProviderProps {
  children: React.ReactNode;
}

/**
 * MSAL event listener component that syncs MSAL state with our AuthContext
 */
const MsalAuthListener: React.FC = () => {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const { login, isAuthenticated: isAppAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Function to determine redirect path based on user role
  const getRedirectPath = (user: any) => {
    // Check if user is admin (student_id === 1)
    if (user && user.student_id === 1) {
      return "/admin";
    }
    // For regular users, use the default path
    return "/chat";
  };

  const handleAuth = useCallback(async () => {
    // Skip if we're not authenticated with MSAL or if we're already authenticated in our app
    if (!isAuthenticated || isAppAuthenticated) {
      return;
    }

    // Skip if there's no active account or we're in the process of logging out
    if (
      accounts.length === 0 ||
      localStorage.getItem("loggingOut") === "true"
    ) {
      return;
    }

    try {
      // Set a flag to prevent multiple token exchanges
      const tokenExchangeInProgress = localStorage.getItem(
        "token_exchange_in_progress"
      );
      if (tokenExchangeInProgress === "true") {
        return;
      }
      localStorage.setItem("token_exchange_in_progress", "true");

      const result = await exchangeAzureToken();
      if (result.success && result.token && result.user) {
        localStorage.setItem("auth_source", "azure_ad");
        await login(result.token, result.user);

        // Small delay to ensure cookies are properly set
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Determine redirect path based on user role
        const redirectPath = getRedirectPath(result.user);
        navigate(redirectPath, { replace: true });
      } else if (result.error) {
        // Only log the error if we're not logging out
        if (localStorage.getItem("loggingOut") !== "true") {
          console.error("Failed to exchange Azure token:", result.error);
        }
        // Clear any partial state on failure
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        localStorage.removeItem("auth_source");
      }
    } catch (error) {
      // Only log the error if we're not logging out
      if (localStorage.getItem("loggingOut") !== "true") {
        console.error("Error during token exchange:", error);
      }
      // Clear any partial state on error
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_source");
    } finally {
      // Clear the token exchange flag
      localStorage.removeItem("token_exchange_in_progress");
    }
  }, [
    isAuthenticated,
    accounts,
    instance,
    login,
    isAppAuthenticated,
    navigate,
  ]);

  useEffect(() => {
    handleAuth();
  }, [handleAuth]);

  return null;
};

/**
 * Main MSAL Auth provider component
 */
export const MsalAuthProvider: React.FC<MsalAuthProviderProps> = ({
  children,
}) => {
  return (
    <MsalProvider instance={msalInstance}>
      <MsalAuthListener />
      {children}
    </MsalProvider>
  );
};

export { msalInstance };
