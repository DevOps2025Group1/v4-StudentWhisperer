// TypeScript declarations for azureAuth.js

export interface TokenExchangeResult {
  success: boolean;
  token?: string;
  user?: {
    email: string;
    name: string;
    auth_source?: string;
  };
  error?: string;
}

/**
 * Get an Azure AD access token
 */
export function getAzureToken(): Promise<string>;

/**
 * Exchange an Azure AD token for an application token
 */
export function exchangeAzureToken(): Promise<TokenExchangeResult>;

/**
 * Call a protected API endpoint using the Azure AD token
 */
export function callProtectedApiWithAzure(
  url: string,
  options?: RequestInit
): Promise<any>;
