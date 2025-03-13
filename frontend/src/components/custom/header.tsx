import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useMsal } from "@azure/msal-react";
import { ChevronDown, LogOut, Moon, Sun, User, Settings } from "lucide-react";
import React, { useState, useEffect } from "react";
import { ProfilePopup, StudentInfo } from "./profile-popup";
import {
  fetchStudentCourses,
  fetchTokenUsage,
  TokenUsageData,
  logoutUser,
} from "@/services/api";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { useTheme } from "@/context/ThemeContext";

interface HeaderProps {
  children?: React.ReactNode;
  rightSection?: React.ReactNode;
  showTitle?: boolean;
}

export const Header = ({
  children,
  rightSection,
  showTitle = true,
}: HeaderProps) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { instance } = useMsal();
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [tokenUsage, setTokenUsage] = useState<TokenUsageData | null>(null);
  const [isLoadingTokens, setIsLoadingTokens] = useState<boolean>(false);
  const { isDarkMode, toggleTheme } = useTheme();

  // Check if current path is chat page
  const isChatPage = location.pathname.includes("/chat");

  // Load student data if the user is authenticated
  useEffect(() => {
    const authUser = localStorage.getItem("auth_user");
    if (authUser && !studentInfo && user) {
      try {
        const userData = JSON.parse(authUser);
        loadStudentData(userData.email);
      } catch (error) {
        console.error("Failed to parse auth_user:", error);
      }
    }
  }, [user]);

  // Load token usage data if user is authenticated
  useEffect(() => {
    if (!user) {
      // Reset token usage state when user is not authenticated
      setTokenUsage(null);
      setIsLoadingTokens(false);
      return;
    }

    const loadAndSetTokenUsage = async () => {
      setIsLoadingTokens(true);
      try {
        const data = await fetchTokenUsage();
        if (data) {
          setTokenUsage(data);
        }
      } catch (err) {
        console.error("Error fetching token usage:", err);
        // Reset token usage on error
        setTokenUsage(null);
      } finally {
        setIsLoadingTokens(false);
      }
    };

    // Initial load
    loadAndSetTokenUsage();

    // Refresh token usage every 20 seconds for more dynamic updates
    const interval = setInterval(loadAndSetTokenUsage, 20000);
    return () => clearInterval(interval);
  }, [user]); // Only depend on user changes

  const handleLogout = async () => {
    const isAzureADSession = localStorage.getItem("auth_source") === "azure_ad";

    setIsDropdownOpen(false); // Close dropdown before logging out

    // Set logging out state to prevent auth attempts
    localStorage.setItem("loggingOut", "true");

    try {
      // Call backend to clear session cookies
      await logoutUser();
    } catch (error) {
      console.error("Error during logout:", error);
    }

    // Clear our app's auth state
    logout();

    // Navigate to login immediately
    navigate("/login");

    // If it's an Azure session, clean up MSAL state silently
    if (isAzureADSession && instance) {
      try {
        // Just clear the account without redirecting
        const accounts = instance.getAllAccounts();
        accounts.forEach((account) => {
          instance.clearCache({
            account,
          });
        });
      } catch (error) {
        console.error("Error clearing MSAL state:", error);
      }
    }

    // Clear the logging out state after a short delay
    setTimeout(() => {
      localStorage.removeItem("loggingOut");
    }, 1000);
  };

  /*
   * Function to load student data from the API
   */
  const loadStudentData = async (email: string) => {
    setIsLoadingProfile(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      // Fetch student data including courses, grades, and program
      const studentData = await fetchStudentCourses(email);

      // Create proper structure for the profile popup
      setStudentInfo({
        name: user.name || "Student",
        email: user.email,
        // Check for various possible structures from the API
        program: studentData.program || studentData.student?.program || null,
        grades: studentData.grades || studentData.student?.grades || [],
      });
    } catch (error) {
      console.error("Error loading student data:", error);
      // Set empty data so we can at least show the profile
      setStudentInfo({
        name:
          JSON.parse(localStorage.getItem("auth_user") || "{}").name ||
          "Student",
        email: email,
        grades: [],
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  /*
   * Function to handle profile information updates (like email change)
   */
  const handleProfileInfoUpdate = (newEmail: string) => {
    // If the student info exists, update it with the new email
    if (studentInfo) {
      setStudentInfo({
        ...studentInfo,
        email: newEmail,
      });
    }

    // Refetch student data with the new email to ensure we have the latest data
    loadStudentData(newEmail);
  };

  /*
   * Function to toggle the profile popup
   */
  const toggleProfile = () => {
    // Close the dropdown menu when opening the profile
    setIsDropdownOpen(false);

    // If opening profile and we don't have data yet, try to load it
    if (!isProfileOpen && !studentInfo && user) {
      const authUser = localStorage.getItem("auth_user");
      if (authUser) {
        try {
          const userData = JSON.parse(authUser);
          loadStudentData(userData.email);
        } catch (error) {
          console.error("Failed to parse auth_user:", error);
        }
      }
    }
    setIsProfileOpen(!isProfileOpen);
  };

  // Function to handle theme toggle and close dropdown
  const handleThemeToggle = () => {
    toggleTheme();
  };

  // Get the user's name to display in the dropdown
  const getUserName = () => {
    if (studentInfo?.name) {
      return studentInfo.name;
    }

    try {
      const authUser = localStorage.getItem("auth_user");
      if (authUser) {
        const userData = JSON.parse(authUser);
        return userData.name || userData.email || "User";
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }

    return "User";
  };

  // Format the token usage for display
  const formatTokenUsage = () => {
    if (!tokenUsage) return "Loading...";

    const { usage, limit, percentage_used } = tokenUsage;
    return `${usage.toLocaleString()} / ${limit.toLocaleString()} tokens (${percentage_used.toFixed(
      1
    )}%)`;
  };

  // Determine token status
  const getTokenStatus = () => {
    if (!tokenUsage) return { isLow: false, isExhausted: false };

    const { percentage_used } = tokenUsage;
    return {
      isLow: percentage_used >= 80 && percentage_used < 100,
      isExhausted: percentage_used >= 100,
    };
  };

  const { isLow, isExhausted } = getTokenStatus();

  // Get appropriate status color for the progress bar
  const getProgressBarClasses = () => {
    if (isExhausted) {
      return {
        bg: "bg-red-100 dark:bg-red-950/50",
        indicator: "bg-red-600 dark:bg-red-500",
      };
    }
    if (isLow) {
      return {
        bg: "bg-amber-100 dark:bg-amber-950/50",
        indicator: "bg-amber-600 dark:bg-amber-500",
      };
    }
    return {
      bg: "bg-slate-200 dark:bg-slate-800",
      indicator: "bg-green-600 dark:bg-green-500",
    };
  };

  const progressBarClasses = getProgressBarClasses();

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {children}
            {/* Only show the title on non-chat pages or if explicitly requested */}
            {showTitle && !isChatPage && (
              <span className="text-lg font-semibold">Student Whisperer</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Token usage progress bar (only for authenticated users) */}
            {user && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-32 h-6 flex items-center">
                      {isLoadingTokens && !tokenUsage ? (
                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      ) : (
                        <Progress
                          value={tokenUsage?.percentage_used || 0}
                          className={`h-2 w-full border ${progressBarClasses.bg}`}
                          indicatorClassName={progressBarClasses.indicator}
                        />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs font-medium">
                      Monthly Token Usage: {formatTokenUsage()}
                    </p>
                    {isExhausted && (
                      <p className="text-xs text-red-500 font-medium mt-1">
                        You have reached your monthly token limit
                      </p>
                    )}
                    {isLow && !isExhausted && (
                      <p className="text-xs text-amber-500 font-medium mt-1">
                        You are running low on tokens
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {user ? (
              <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{getUserName()}</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2">
                  <div className="grid gap-1">
                    <Button
                      variant="ghost"
                      className="flex w-full justify-start items-center"
                      onClick={toggleProfile}
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Button>
                    {user.student_id === 1 && (
                      <Button
                        variant="ghost"
                        className="flex w-full justify-start items-center"
                        onClick={() => navigate("/admin")}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Admin</span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      className="flex w-full justify-start items-center"
                      onClick={handleThemeToggle}
                    >
                      {isDarkMode ? (
                        <>
                          <Sun className="mr-2 h-4 w-4" />
                          <span>Light Mode</span>
                        </>
                      ) : (
                        <>
                          <Moon className="mr-2 h-4 w-4" />
                          <span>Dark Mode</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex w-full justify-start items-center text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <ThemeToggle />
            )}
            {rightSection}
          </div>
        </div>
      </header>
      {isProfileOpen && (
        <ProfilePopup
          studentInfo={studentInfo}
          isLoading={isLoadingProfile}
          onClose={() => setIsProfileOpen(false)}
          onInfoUpdate={handleProfileInfoUpdate}
        />
      )}
    </>
  );
};
