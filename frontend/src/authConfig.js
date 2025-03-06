export const msalConfig = {
  auth: {
    clientId: "6ba8635a-24d7-468f-a6d1-6d619931969f",
    authority: "https://login.microsoftonline.com/f4e52973-e80e-4711-9fa2-250b17c1c4f6",
    redirectUri: "https://studentwhisperer-frontend-ca.ashybeach-eb1fae7a.westeurope.azurecontainerapps.io/auth/callback",
  },
};

export const loginRequest = {
  scopes: ["api://your-flask-api/access_flask_api"],
};
