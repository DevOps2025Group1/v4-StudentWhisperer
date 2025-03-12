import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useMsal } from "@azure/msal-react";
import { LogOut, User, Settings } from "lucide-react";
import React, { useState, useEffect } from "react";
import { ProfilePopup, StudentInfo } from "./profile-popup";
import { fetchStudentCourses } from "@/services/api";

interface HeaderProps {
  children?: React.ReactNode;
  rightSection?: React.ReactNode;
}

export const Header = ({ children, rightSection }: HeaderProps) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { instance } = useMsal();
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  
  // Load student data if the user is authenticated
  useEffect(() => {
    const authUser = localStorage.getItem('auth_user');
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
        accounts.forEach(account => {
          instance.clearCache({
            account
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
      const authUser = localStorage.getItem('auth_user');
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
        grades: studentData.grades || 
                studentData.student?.grades || 
                []
      });
    } catch (error) {
      console.error("Error loading student data:", error);
      // Set empty data so we can at least show the profile
      setStudentInfo({
        name: JSON.parse(localStorage.getItem('auth_user') || '{}').name || "Student",
        email: email,
        grades: []
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
        email: newEmail
      });
    }

    // Refetch student data with the new email to ensure we have the latest data
    loadStudentData(newEmail);
  };

  /* 
   * Function to toggle the profile popup
   */
  const toggleProfile = () => {
    // If opening profile and we don't have data yet, try to load it
    if (!isProfileOpen && !studentInfo && user) {
      const authUser = localStorage.getItem('auth_user');
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
  
  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {children}
            <span className="text-lg font-semibold">Student Whisperer</span>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <>
                {user.student_id === 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-full"
                    onClick={() => navigate('/admin')}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 rounded-full"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
                <Button
                  onClick={toggleProfile}
                  variant="ghost"
                  size="icon"
                  className="size-9 rounded-full"
                >
                  <User className="h-4 w-4" />
                </Button>
              </>
            )}
            {rightSection}
            <ThemeToggle />
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