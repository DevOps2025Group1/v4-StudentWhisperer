import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./authConfig";

function AuthenticatedComponent() {
  const { instance, accounts } = useMsal();

  const getToken = async () => {
    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0],
    });
    return response.accessToken;
  };

  const callApi = async () => {
    const token = await getToken();
    const response = await fetch("https://your-flask-api.azurewebsites.net/protected-api", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    console.log(data);
  };

  return <button onClick={callApi}>Call Secure API</button>;
}

export default AuthenticatedComponent;
