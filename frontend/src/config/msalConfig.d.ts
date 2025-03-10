import { Configuration } from "@azure/msal-browser";

// Define types for our MSAL configuration objects
export const msalConfig: Configuration;

export interface LoginRequest {
  scopes: string[];
}

export const loginRequest: LoginRequest;
export const protectedResourceMap: Map<string, string[]>;
export const silentRequest: {
  scopes: string[];
};