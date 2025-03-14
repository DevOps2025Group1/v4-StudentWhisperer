/**
 * MSAL configuration for Azure AD authentication
 */

// MSAL configuration object
export const msalConfig = {
  auth: {
    clientId: "a92b7d10-cce3-48d9-b794-1210c1a4e9bb",
    authority: "https://login.microsoftonline.com/common",
    redirectUri:
      window.ENV?.VITE_FRONTEND_URL || import.meta.env.VITE_FRONTEND_URL,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

// Login request object with basic scopes only
export const loginRequest = {
  scopes: ["openid", "profile", "email"],
};

// Optional - Used for protected resources scopes
export const protectedResourceMap = new Map([
  ["https://graph.microsoft.com/v1.0/me", ["user.read"]],
]);

// Endpoints for silent token acquisition attempts
export const silentRequest = {
  scopes: ["openid", "profile", "email"],
};
