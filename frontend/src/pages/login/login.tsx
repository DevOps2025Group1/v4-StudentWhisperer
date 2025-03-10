import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/custom/header";
import { loginUser } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/config/msalConfig";

interface LocationState {
  from?: string;
}

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { instance } = useMsal();

  const locationState = location.state as LocationState;
  const from = locationState?.from || "/chat";

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Clear error when user types
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Attempt to login the user using our API service
      const { email, password } = formData;
      const result = await loginUser({ email, password });

      if (result.success) {
        // Store the authentication token and user info
        const { token, user } = result.data;
        login(token, user);

        // Redirect to the intended page or chat
        navigate(from);
      } else {
        // Handle login error
        setErrors({
          form: result.error || "Invalid email or password. Please try again.",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrors({
        form: "Login failed. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Test login function
  const handleTestLogin = async () => {
    setIsSubmitting(true);

    try {
      // Use test credentials
      const testCredentials = {
        email: "john.doe@studentwhisperer.com",
        password: "TSEyshinTiNf",
      };

      const result = await loginUser(testCredentials);

      if (result.success) {
        // Store the authentication token and user info
        const { token, user } = result.data;
        login(token, user);

        // Navigate to the chat page
        navigate(from);
      } else {
        setErrors({
          form: "Test login failed. Please check if the backend is running.",
        });
      }
    } catch (error) {
      console.error("Test login error:", error);
      setErrors({
        form: "Test login failed. Please check if the backend is running.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Microsoft login handler
  const handleMicrosoftLogin = async () => {
    try {
      setIsSubmitting(true);
      await instance.loginPopup(loginRequest);
      // The MsalAuthListener component will handle the login success and update AuthContext
      // which will then automatically redirect to the protected route
    } catch (error) {
      console.error("Microsoft login error:", error);
      setErrors({
        form: "Microsoft login failed. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-w-0 h-dvh bg-background">
      <Header />

      <div className="flex flex-col items-center justify-center flex-1 px-4 py-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
            <p className="text-muted-foreground text-center">
              Sign in to your Student Whisperer account
            </p>
          </div>

          <Card className="p-6 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? "border-red-500" : ""}
                  placeholder="john.doe@example.com"
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? "border-red-500" : ""}
                />
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password}</p>
                )}
              </div>

              {errors.form && (
                <p className="text-sm text-red-500 text-center">
                  {errors.form}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Signing In..." : "Sign In"}
              </Button>

              {/* Azure AD login button */}
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleMicrosoftLogin}
                disabled={isSubmitting}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 23 23"
                  className="mr-2 h-5 w-5"
                  fill="currentColor"
                >
                  <path d="M0 0h23v23H0z" fill="none" />
                  <path d="M11.5 0C17.9 0 23 5.1 23 11.5S17.9 23 11.5 23 0 17.9 0 11.5 5.1 0 11.5 0zm-6 5v6h6V5h-6zm8 0v6h6V5h-6zm-8 8v6h6v-6h-6zm8 0v6h6v-6h-6z" />
                </svg>
                Sign in with Microsoft
              </Button>

              {/* Test login button */}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleTestLogin}
                disabled={isSubmitting}
              >
                Test Login (No Account Required)
              </Button>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">
                  Don't have an account?{" "}
                </span>
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="text-primary hover:underline focus:outline-none"
                >
                  Register
                </button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
