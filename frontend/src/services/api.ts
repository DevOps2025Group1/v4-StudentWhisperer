// API service for interacting with the backend

// Get the API URL from environment variables or use a default (azure backend)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
        error: errorData.message || "Registration failed"
      };
    }

    return {
      success: true,
      data: await response.json()
    };
  } catch (error) {
    console.error("Registration failed:", error);
    return {
      success: false,
      error: "Could not connect to registration service"
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
        error: errorData.message || "Login failed"
      };
    }

    return {
      success: true,
      data: await response.json()
    };
  } catch (error) {
    console.error("Login failed:", error);
    return {
      success: false,
      error: "Could not connect to authentication service"
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("Echo test failed:", error);
    return { error: "Echo request failed" };
  }
}
