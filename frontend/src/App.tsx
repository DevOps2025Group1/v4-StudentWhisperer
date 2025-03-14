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
import { AuthenticatedRoute } from "./components/custom/authenticated-route";
import { AdminRoute } from "./components/custom/admin-route";
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
                  {/* Root path redirects to login */}
                  <Route path="/" element={<Navigate to="/login" replace />} />

                  {/* Authentication routes (only for unauthenticated users) */}
                  <Route
                    path="/register"
                    element={
                      <AuthenticatedRoute>
                        <Register />
                      </AuthenticatedRoute>
                    }
                  />
                  <Route
                    path="/login"
                    element={
                      <AuthenticatedRoute>
                        <Login />
                      </AuthenticatedRoute>
                    }
                  />

                  {/* Protected routes (only for authenticated users) */}
                  <Route
                    path="/chat"
                    element={
                      <ProtectedRoute>
                        <Chat />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin route (only for users with student_id === 1) */}
                  <Route
                    path="/admin"
                    element={
                      <AdminRoute>
                        <Admin />
                      </AdminRoute>
                    }
                  />

                  {/* Redirect unmatched routes to login or chat based on auth state */}
                  <Route path="*" element={<Navigate to="/login" replace />} />
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
