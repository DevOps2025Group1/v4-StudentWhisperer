import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useMsal } from "@azure/msal-react";
import { ChevronDown, LogOut, Moon, Sun, User, Settings } from "lucide-react";
import React, { useState, useEffect } from "react";
import { ProfilePopup, StudentInfo } from "./profile-popup";
import { fetchStudentCourses } from "@/services/api";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

  const handleLogout = async () => {
    const isAzureADSession = localStorage.getItem("auth_source") === "azure_ad";

    setIsDropdownOpen(false); // Close dropdown before logging out

    // Set logging out state to prevent auth attempts
    localStorage.setItem("loggingOut", "true");

    // Clear our app's auth state first
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
          <div className="flex items-center gap-2">
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
                        <Settings className="h-4 w-4" />
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
