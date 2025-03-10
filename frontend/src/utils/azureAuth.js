import { loginRequest } from "../config/msalConfig";
import { msalInstance } from "../components/custom/msal-auth-provider";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://studentwhisperer-backend-ca.ashybeach-eb1fae7a.westeurope.azurecontainerapps.io";
//   "http://localhost:5000";

/**
 * Get an access token for the backend API
 * @returns {Promise<string>} The access token
 */
export const getAzureToken = async () => {
  try {
    const account = msalInstance.getActiveAccount();
    if (!account) {
      // Ensure we have an active account
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        msalInstance.setActiveAccount(accounts[0]);
      } else {
        throw new Error("No active account! Verify a user has been signed in");
      }
    }

    // Request both ID token and access token
    const response = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account: msalInstance.getActiveAccount(),
    });

    return response.idToken; // Use ID token for backend authentication
  } catch (error) {
    console.error("Silent token acquisition failed", error);

    if (error.name === "InteractionRequiredAuthError") {
      try {
        const response = await msalInstance.acquireTokenPopup(loginRequest);
        return response.idToken; // Use ID token for backend authentication
      } catch (err) {
        console.error("Interactive token acquisition failed", err);
        throw err;
      }
    }
    throw error;
  }
};

/**
 * Exchange an Azure AD token for an application token
 * @returns {Promise<Object>} Object containing token and user info
 */
export const exchangeAzureToken = async () => {
  try {
    // Get Azure AD token
    const azureToken = await getAzureToken();

    // Exchange it for an application token
    const response = await fetch(`${API_URL}/api/auth/azure-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${azureToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to exchange token");
    }

    const data = await response.json();
    return {
      success: true,
      token: data.token,
      user: data.user,
    };
  } catch (error) {
    console.error("Token exchange failed:", error);
    return {
      success: false,
      error: error.message || "Failed to authenticate with Azure AD",
    };
  }
};

/**
 * Make an authenticated API call to the backend using the Azure token
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Object>} The API response
 */
export const callProtectedApiWithAzure = async (url, options = {}) => {
  try {
    const token = await getAzureToken();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Protected API call failed:", error);
    throw error;
  }
};

/**
 * Get an access token for the backend API (legacy function for compatibility)
 * @param {Object} msalInstance - The MSAL instance from useMsal hook
 * @returns {Promise<string>} The access token
 */
export const getToken = async (msalInstance) => {
  try {
    const response = await msalInstance.acquireTokenSilent(loginRequest);
    return response.accessToken;
  } catch (error) {
    // If silent token acquisition fails, fallback to interactive method
    console.error("Silent token acquisition failed", error);

    if (error.name === "InteractionRequiredAuthError") {
      try {
        const response = await msalInstance.acquireTokenPopup(loginRequest);
        return response.accessToken;
      } catch (err) {
        console.error("Interactive token acquisition failed", err);
        throw err;
      }
    }
    throw error;
  }
};

/**
 * Make an authenticated API call to the backend (legacy function for compatibility)
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Fetch options (method, body, etc.)
 * @param {Object} msalInstance - The MSAL instance from useMsal hook
 * @returns {Promise<Object>} The API response
 */
export const callProtectedApi = async (url, options = {}, msalInstance) => {
  try {
    const token = await getToken(msalInstance);

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Protected API call failed:", error);
    throw error;
  }
};

/**
 * Example usage of protected API call
 *
 * import { useMsal } from "@azure/msal-react";
 * import { callProtectedApi } from "../utils/azureAuth";
 *
 * function YourComponent() {
 *   const { instance } = useMsal();
 *
 *   const fetchData = async () => {
 *     try {
 *       const data = await callProtectedApi(
 *         "https://your-backend-url.com/api/endpoint",
 *         { method: "GET" },
 *         instance
 *       );
 *       console.log(data);
 *     } catch (error) {
 *       console.error("Error fetching data:", error);
 *     }
 *   };
 *
 *   return (
 *     <button onClick={fetchData}>Fetch Protected Data</button>
 *   );
 * }
 */
