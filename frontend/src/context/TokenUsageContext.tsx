import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { fetchTokenUsage, TokenUsageData } from "@/services/api";
import { useAuth } from "./AuthContext";

interface TokenUsageContextType {
  tokenUsage: TokenUsageData | null;
  isLoading: boolean;
  refreshTokenUsage: () => Promise<void>;
}

// Create the context with a default value
const TokenUsageContext = createContext<TokenUsageContextType | undefined>(
  undefined
);

// Hook to use the token usage context
export const useTokenUsage = () => {
  const context = useContext(TokenUsageContext);
  if (!context) {
    throw new Error("useTokenUsage must be used within a TokenUsageProvider");
  }
  return context;
};

interface TokenUsageProviderProps {
  children: ReactNode;
}

export const TokenUsageProvider = ({ children }: TokenUsageProviderProps) => {
  const [tokenUsage, setTokenUsage] = useState<TokenUsageData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { user } = useAuth();

  // Function to refresh token usage data
  const refreshTokenUsage = async () => {
    if (!user) {
      setTokenUsage(null);
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchTokenUsage();
      if (data) {
        setTokenUsage(data);
      }
    } catch (err) {
      console.error("Error fetching token usage:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load token usage data when user changes
  useEffect(() => {
    refreshTokenUsage();

    // Also set up an interval to refresh periodically
    if (user) {
      const interval = setInterval(refreshTokenUsage, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  // Context value
  const value = {
    tokenUsage,
    isLoading,
    refreshTokenUsage,
  };

  return (
    <TokenUsageContext.Provider value={value}>
      {children}
    </TokenUsageContext.Provider>
  );
};
