import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { validateToken } from "../services/api";

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: any | null;
  loading: boolean;
  login: (token: string, user: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Helper functions to get initial state from localStorage
const getInitialToken = (): string | null => {
  return localStorage.getItem("auth_token");
};

const getInitialUser = (): any | null => {
  const savedUser = localStorage.getItem("auth_user");
  return savedUser ? JSON.parse(savedUser) : null;
};

const getInitialAuthState = (): boolean => {
  return !!localStorage.getItem("auth_token");
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Initialize state directly from localStorage
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    getInitialAuthState()
  );
  const [token, setToken] = useState<string | null>(getInitialToken());
  const [user, setUser] = useState<any | null>(getInitialUser());
  const [loading, setLoading] = useState<boolean>(true);

  // Verify token validity on mount
  useEffect(() => {
    const verifyTokenValidity = async () => {
      // Skip verification if we're already loading or don't have a token
      if (loading || !localStorage.getItem("auth_token")) {
        setLoading(false);
        return;
      }

      try {
        const savedToken = localStorage.getItem("auth_token");
        const savedUser = localStorage.getItem("auth_user");
        const authSource = localStorage.getItem("auth_source");

        // Skip token validation for SSO sessions as they're handled by MSAL
        if (authSource === "azure_ad") {
          if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
            setIsAuthenticated(true);
          }
          setLoading(false);
          return;
        }

        if (savedToken && savedUser) {
          // Only verify if current state doesn't match stored state
          const storedUser = JSON.parse(savedUser);
          if (token === savedToken && JSON.stringify(user) === JSON.stringify(storedUser)) {
            setLoading(false);
            return;
          }

          // Verify token with backend
          const isValid = await validateToken();

          if (isValid) {
            setToken(savedToken);
            setUser(storedUser);
            setIsAuthenticated(true);
          } else {
            // Token is not valid, clear auth state
            console.log("Token validation failed, logging out");
            setIsAuthenticated(false);
            setToken(null);
            setUser(null);
            localStorage.removeItem("auth_token");
            localStorage.removeItem("auth_user");
            localStorage.removeItem("auth_source");
          }
        } else {
          // Clear any partial state if token or user is missing
          setIsAuthenticated(false);
          setToken(null);
          setUser(null);
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_user");
          localStorage.removeItem("auth_source");
        }
      } catch (error) {
        console.error("Error verifying auth state:", error);
        // Clear auth on error
        setIsAuthenticated(false);
        setToken(null);
        setUser(null);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        localStorage.removeItem("auth_source");
      } finally {
        setLoading(false);
      }
    };

    verifyTokenValidity();
  }, [loading, token, user]); // Add proper dependencies

  const login = (newToken: string, newUser: any) => {
    localStorage.setItem("auth_token", newToken);
    localStorage.setItem("auth_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setIsAuthenticated(true);
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_source");
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    isAuthenticated,
    token,
    user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
