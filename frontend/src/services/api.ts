// API service for interacting with the backend
// Get the API URL from runtime environment variables, fallback to build-time env vars
// This allows the value to be overridden at container runtime
declare global {
  interface Window {
    ENV?: {
      VITE_API_URL?: string;
      VITE_FRONTEND_URL?: string;
    };
  }
}

// Prioritize runtime env over build-time env
const API_URL = window.ENV?.VITE_API_URL || import.meta.env.VITE_API_URL;


// User registration interface
export interface RegisterUserData {
  name: string;
  email: string;
  password: string;
}

// User login interface
export interface LoginUserData {
  email: string;
  password: string;
}

// Helper to get auth token from storage
const getAuthToken = (): string | null => {
  return localStorage.getItem("auth_token");
};

// Helper to create headers with authentication
const createAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Validate token against the backend
 * @returns {Promise<boolean>} True if token is valid, false otherwise
 */
export async function validateToken(): Promise<boolean> {
  const token = getAuthToken();
  if (!token) {
    return false;
  }

  try {
    // Call the /api/me endpoint which requires authentication
    const response = await fetch(`${API_URL}/api/me`, {
      method: "GET",
      headers: createAuthHeaders(),
    });

    return response.ok;
  } catch (error) {
    console.error("Token validation failed:", error);
    return false;
  }
}

/**
 * Fetch health status from the backend
 */
export async function checkApiHealth() {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    return await response.json();
  } catch (error) {
    console.error("Health check failed:", error);
    return { status: "error", message: "Could not connect to API" };
  }
}

/**
 * Register a new user
 */
export async function registerUser(userData: RegisterUserData) {
  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || "Registration failed",
      };
    }

    return {
      success: true,
      data: await response.json(),
    };
  } catch (error) {
    console.error("Registration failed:", error);
    return {
      success: false,
      error: "Could not connect to registration service",
    };
  }
}

/**
 * Login a user
 */
export async function loginUser(userData: LoginUserData) {
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || "Login failed",
      };
    }

    return {
      success: true,
      data: await response.json(),
    };
  } catch (error) {
    console.error("Login failed:", error);
    return {
      success: false,
      error: "Could not connect to authentication service",
    };
  }
}

/**
 * Send a message to the chat endpoint
 */
export async function sendChatMessage(message: string) {
  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      credentials: "include",
      headers: createAuthHeaders(),
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Handle unauthorized error
        return { error: "Authentication required. Please log in again." };
      }
      return { error: `Request failed with status: ${response.status}` };
    }

    return await response.json();
  } catch (error) {
    console.error("Chat request failed:", error);
    return { error: "Failed to send message" };
  }
}

/**
 * Call a protected API endpoint that requires authentication
 */
export async function callProtectedEndpoint() {
  try {
    const response = await fetch(`${API_URL}/api/protected`, {
      method: "GET",
      headers: createAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { error: "Authentication required. Please log in again." };
      }
      return { error: `Request failed with status: ${response.status}` };
    }

    return await response.json();
  } catch (error) {
    console.error("Protected API request failed:", error);
    return { error: "Failed to access protected endpoint" };
  }
}

/**
 * Get current user information
 */
export async function getCurrentUser() {
  try {
    const response = await fetch(`${API_URL}/api/me`, {
      method: "GET",
      headers: createAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: "Authentication required" };
      }
      return {
        success: false,
        error: `Request failed with status: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      user: data.user,
    };
  } catch (error) {
    console.error("Failed to fetch user info:", error);
    return {
      success: false,
      error: "Failed to fetch user information",
    };
  }
}

/* 
 * Fetch student data from the backend
 */
export async function fetchStudentCourses(email: string) {
  try {
    const response = await fetch(`${API_URL}/api/student/courses?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      credentials: 'include',
      headers: createAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching student courses:', error);
    // Return empty data structure to prevent undefined errors
    return { program: null, grades: [] };
  }
}

/**
 * Fetch metrics from the backend
 */
export async function fetchMetrics() {
  try {
    const response = await fetch(
      `${API_URL}/api/metrics`,
      {
        credentials: 'include',
        headers: createAuthHeaders()
      }
    );
    if (!response.ok) {
      throw new Error('Failed to fetch metrics');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching metrics:', error);
    throw error;
  }
}

/**
 * Update user email
 * @param currentEmail Current email of the user
 * @param newEmail New email to set
 * @param password Current password for verification
 */
export async function updateUserEmail(currentEmail: string, newEmail: string, password: string) {
  try {
    const response = await fetch(`${API_URL}/api/student/update-email`, {
      method: 'PUT',
      headers: createAuthHeaders(),
      body: JSON.stringify({
        currentEmail,
        newEmail,
        password
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.message || `Request failed with status: ${response.status}`
      };
    }
    
    return {
      success: true,
      message: data.message || "Email updated successfully"
    };
  } catch (error) {
    console.error('Error updating email:', error);
    return {
      success: false,
      error: "Failed to connect to the server"
    };
  }
}

/**
 * Update user password
 * @param email Email of the user
 * @param currentPassword Current password
 * @param newPassword New password to set
 */
export async function updateUserPassword(email: string, currentPassword: string, newPassword: string) {
  try {
    const response = await fetch(`${API_URL}/api/student/update-password`, {
      method: 'PUT',
      headers: createAuthHeaders(),
      body: JSON.stringify({
        email,
        currentPassword,
        newPassword
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.message || `Request failed with status: ${response.status}`
      };
    }
    
    return {
      success: true,
      message: data.message || "Password updated successfully"
    };
  } catch (error) {
    console.error('Error updating password:', error);
    return {
      success: false,
      error: "Failed to connect to the server"
    };
  }
}
