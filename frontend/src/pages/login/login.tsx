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

  // Demo login function
  const handleDemoLogin = async () => {
    setIsSubmitting(true);
    try {
      // Use demo credentials
      const demoCredentials = {
        email: "john.doe@studentwhisperer.com",
        password: "m^/6e3dD'zP=A,$-Y(x@b{",
      };
      const result = await loginUser(demoCredentials);
      if (result.success) {
        // Store the authentication token and user info
        const { token, user } = result.data;
        login(token, user);
        // Navigate to the chat page
        navigate(from);
      } else {
        setErrors({
          form: "Demo login failed. Please check if the backend is running.",
        });
      }
    } catch (error) {
      console.error("Demo login error:", error);
      setErrors({
        form: "Demo login failed. Please check if the backend is running.",
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
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Standard login form fields */}
              <div className="space-y-4">
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

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing In..." : "Sign In"}
                </Button>
              </div>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-muted"></div>
                <span className="flex-shrink mx-3 text-xs text-muted-foreground">
                  or continue with
                </span>
                <div className="flex-grow border-t border-muted"></div>
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-center"
                  onClick={handleMicrosoftLogin}
                  disabled={isSubmitting}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 21 21"
                    className="mr-2"
                  >
                    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                  </svg>
                  Sign in with Microsoft
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleDemoLogin}
                  disabled={isSubmitting}
                >
                  Demo Login (No Account Required)
                </Button>
              </div>

              <div className="pt-3 mt-2 border-t border-border text-center text-sm">
                <p className="pt-2">
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
                </p>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
