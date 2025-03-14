import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
  useCallback,
} from "react";
import { fetchTokenUsage, TokenUsageData } from "@/services/api";
import { useAuth } from "./AuthContext";

interface TokenUsageContextType {
  tokenUsage: TokenUsageData | null;
  isLoading: boolean;
  error: string | null;
  refreshTokenUsage: () => Promise<void>;
}

const TokenUsageContext = createContext<TokenUsageContextType | undefined>(
  undefined
);

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
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();

  const isInitialized = useRef<boolean>(false);
  const intervalRef = useRef<number | null>(null);
  const lastFetchRef = useRef<number>(0);

  const MIN_FETCH_INTERVAL = 10000; // 10 seconds between fetches
  const RETRY_DELAY = 5000; // 5 seconds before retrying after error
  const UPDATE_INTERVAL = 30000; // 30 seconds between regular updates

  const refreshTokenUsage = useCallback(
    async (isInitialLoad = false): Promise<void> => {
      if (!user || !isAuthenticated) {
        setTokenUsage(null);
        setError(null);
        return;
      }

      // Implement rate limiting
      const now = Date.now();
      if (!isInitialLoad && now - lastFetchRef.current < MIN_FETCH_INTERVAL) {
        return;
      }

      if (isLoading) {
        return;
      }

      setIsLoading(true);
      setError(null);
      lastFetchRef.current = now;

      try {
        const data = await fetchTokenUsage();
        setTokenUsage(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch token usage";
        console.error("Token usage error:", errorMessage);
        setError(errorMessage);

        // Schedule a retry after delay
        setTimeout(() => refreshTokenUsage(false), RETRY_DELAY);
      } finally {
        setIsLoading(false);
      }
    },
    [user, isAuthenticated]
  );

  useEffect(() => {
    const cleanup = () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isInitialized.current = false;
    };

    if (!isAuthenticated || !user) {
      cleanup();
      setTokenUsage(null);
      setError(null);
      return;
    }

    if (!isInitialized.current) {
      isInitialized.current = true;
      refreshTokenUsage(true);

      intervalRef.current = window.setInterval(
        () => refreshTokenUsage(false),
        UPDATE_INTERVAL
      );
    }

    return cleanup;
  }, [user?.student_id, isAuthenticated, refreshTokenUsage]);

  return (
    <TokenUsageContext.Provider
      value={{
        tokenUsage,
        isLoading,
        error,
        refreshTokenUsage: () => refreshTokenUsage(false),
      }}
    >
      {children}
    </TokenUsageContext.Provider>
  );
};
