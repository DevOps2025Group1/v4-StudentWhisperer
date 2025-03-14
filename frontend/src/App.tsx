import "./App.css";
import { Chat } from "./pages/chat/chat";
import { Register } from "./pages/register/register";
import { Login } from "./pages/login/login";
import { Admin } from "./pages/admin/admin";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { TokenUsageProvider } from "./context/TokenUsageContext";
import { ProtectedRoute } from "./components/custom/protected-route";
import { MsalAuthProvider } from "./components/custom/msal-auth-provider";

function App() {
  return (
    <Router>
      <AuthProvider>
        <MsalAuthProvider>
          <ThemeProvider>
            <TokenUsageProvider>
              <div className="w-full h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                <Routes>
                  <Route path="/" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/login" element={<Login />} />
                  <Route
                    path="/chat"
                    element={
                      <ProtectedRoute>
                        <Chat />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </TokenUsageProvider>
          </ThemeProvider>
        </MsalAuthProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
