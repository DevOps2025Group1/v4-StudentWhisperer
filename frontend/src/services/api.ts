// API service for interacting with the backend

// Get the API URL from environment variables or use a default (azure backend)
const API_URL =
  import.meta.env.VITE_API_URL ||
  //"https://studentwhisperer-backend-ca.ashybeach-eb1fae7a.westeurope.azurecontainerapps.io";
   "http://localhost:5000";

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
 * Fetch sample messages from the backend
 */
export async function getSampleMessages() {
  try {
    const response = await fetch(`${API_URL}/api/messages`);
    const data = await response.json();
    return data.messages;
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return [];
  }
}

/**
 * Send a message to the chat endpoint
 */
export async function sendChatMessage(message: string) {
  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
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
 * Echo test function
 */
export async function echoTest(data: any) {
  try {
    const response = await fetch(`${API_URL}/api/echo`, {
      method: "POST",
      headers: createAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { error: "Authentication required. Please log in again." };
      }
      return { error: `Request failed with status: ${response.status}` };
    }

    return await response.json();
  } catch (error) {
    console.error("Echo test failed:", error);
    return { error: "Echo request failed" };
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
