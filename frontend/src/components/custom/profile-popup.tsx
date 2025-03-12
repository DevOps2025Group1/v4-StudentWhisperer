import { Button } from "@/components/ui/button";
import { X, BookOpen, Save } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUserEmail, updateUserPassword } from "@/services/api";

interface Course {
  id: number;
  name: string;
  european_credits: number;
  program_id: number;
}

interface Grade {
  id: number;
  course_id: number;
  grade: string;
  feedback?: string;
  created_at: string;
  course: Course;
}

interface Program {
  id: number;
  name: string;
  european_credits: number;
}

export interface StudentInfo {
  name: string;
  email: string;
  program?: Program;
  grades: Grade[];
}

interface ProfilePopupProps {
  studentInfo: StudentInfo | null;
  isLoading: boolean;
  onClose: () => void;
  onInfoUpdate?: (email: string) => void;
}

export function ProfilePopup({ studentInfo, isLoading, onClose, onInfoUpdate }: ProfilePopupProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailUpdateStatus, setEmailUpdateStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [passwordUpdateStatus, setPasswordUpdateStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleEmailUpdate = async () => {
    if (!studentInfo) return;
    if (!newEmail.trim()) {
      setEmailUpdateStatus({ success: false, message: "Email cannot be empty" });
      return;
    }

    setIsUpdating(true);
    try {
      const result = await updateUserEmail(studentInfo.email, newEmail, currentPassword);
      if (result.success) {
        setEmailUpdateStatus({ success: true, message: "Email updated successfully!" });
        // Update local storage with new email if needed
        const authUser = localStorage.getItem('auth_user');
        if (authUser) {
          const user = JSON.parse(authUser);
          user.email = newEmail;
          localStorage.setItem('auth_user', JSON.stringify(user));
        }
        
        // Notify parent component to update student info
        if (onInfoUpdate) onInfoUpdate(newEmail);
        
        // Clear form
        setNewEmail('');
        setCurrentPassword('');
      } else {
        setEmailUpdateStatus({ success: false, message: result.error || "Failed to update email" });
      }
    } catch (error) {
      setEmailUpdateStatus({ success: false, message: "An error occurred while updating email" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!studentInfo) return;
    
    // Validate passwords
    if (!currentPassword) {
      setPasswordUpdateStatus({ success: false, message: "Current password is required" });
      return;
    }
    
    if (!newPassword) {
      setPasswordUpdateStatus({ success: false, message: "New password cannot be empty" });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordUpdateStatus({ success: false, message: "New passwords don't match" });
      return;
    }

    setIsUpdating(true);
    try {
      const result = await updateUserPassword(studentInfo.email, currentPassword, newPassword);
      if (result.success) {
        setPasswordUpdateStatus({ success: true, message: "Password updated successfully!" });
        
        // Clear form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordUpdateStatus({ success: false, message: result.error || "Failed to update password" });
      }
    } catch (error) {
      setPasswordUpdateStatus({ success: false, message: "An error occurred while updating password" });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background rounded-lg shadow-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Student Profile</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!studentInfo) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background rounded-lg shadow-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Student Profile</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-center py-8">
            <p>Not logged in or unable to load student information.</p>
          </div>
        </div>
      </div>
    );
  }

  // Determine if all grades are passing (5.5 or higher in Dutch grading system)
  const hasGoodGrades = studentInfo.grades.every(gradeItem => {
    const numericGrade = parseFloat(gradeItem.grade);
    return !isNaN(numericGrade) && numericGrade >= 5.5;
  });

  // Calculate total EC earned (only for passed courses)
  const totalCreditsEarned = studentInfo.grades.reduce((total, gradeItem) => {
    const numericGrade = parseFloat(gradeItem.grade);
    if (!isNaN(numericGrade) && numericGrade >= 5.5) {
      return total + (gradeItem.course.european_credits || 0);
    }
    return total;
  }, 0);

  // Calculate total EC required to complete program
  const totalProgramCredits = studentInfo.program?.european_credits || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      {/* Changed padding to pt-0 and added an inner container with padding for content */}
      <div className="bg-background rounded-lg shadow-lg pt-0 px-0 pb-0 max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header with its own padding */}
        <div className="flex justify-between items-center px-6 py-4 sticky top-0 z-10 bg-background border-b">
          <h2 className="text-xl font-bold">Student Profile</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Tab navigation with its own padding */}
        <div className="flex border-b sticky top-[60px] z-10 bg-background px-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 font-medium text-sm ${activeTab === 'profile' 
              ? 'border-b-2 border-primary text-primary' 
              : 'text-muted-foreground'}`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 font-medium text-sm ${activeTab === 'settings' 
              ? 'border-b-2 border-primary text-primary' 
              : 'text-muted-foreground'}`}
          >
            Settings
          </button>
        </div>
        
        {/* Scrollable content area with padding */}
        <div className="overflow-y-auto flex-1 p-6">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center mb-4">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
                  {studentInfo.name.charAt(0).toUpperCase()}
                </div>
              </div>
              
              <div className="space-y-2 text-center">
                <h3 className="font-medium text-lg">{studentInfo.name}</h3>
                <p className="text-muted-foreground">{studentInfo.email}</p>
                {studentInfo.program && (
                  <div className="flex items-center justify-center gap-1 text-sm">
                    <BookOpen className="h-4 w-4 opacity-70" />
                    <span>{studentInfo.program.name}</span>
                  </div>
                )}
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Courses & Grades</h4>
                  {totalProgramCredits > 0 && (
                    <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-md">
                      {totalCreditsEarned} / {totalProgramCredits} EC
                    </span>
                  )}
                </div>
                
                {studentInfo.grades.length > 0 ? (
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted">
                          <th className="p-2 text-left">Course</th>
                          <th className="p-2 text-center">EC</th>
                          <th className="p-2 text-right">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentInfo.grades.map((gradeItem, index) => {
                          const numericGrade = parseFloat(gradeItem.grade);
                          const isPassing = !isNaN(numericGrade) && numericGrade >= 5.5;
                          
                          return (
                            <tr key={gradeItem.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/50"}>
                              <td className="p-2">{gradeItem.course.name}</td>
                              <td className="p-2 text-center">{gradeItem.course.european_credits || "-"}</td>
                              <td 
                                className={`p-2 text-right ${
                                  isNaN(numericGrade) ? "" : isPassing ? "text-green-500" : "text-red-500"
                                }`}
                                title={gradeItem.feedback || ""}
                              >
                                {gradeItem.grade}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic text-center py-4">No courses or grades found</p>
                )}
              </div>
              
              {studentInfo.grades.length > 0 && (
                <div className="border-t pt-4">
                  <p className={`font-medium ${hasGoodGrades ? "text-green-500" : "text-amber-500"}`}>
                    {hasGoodGrades 
                      ? "All courses passed successfully!" 
                      : "Some courses need improvement."}
                  </p>
                  
                  {studentInfo.grades.some(g => g.feedback) && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Hover over grades to see feedback (where available)
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Update Email</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="current-email">Current Email</Label>
                  <Input 
                    id="current-email" 
                    value={studentInfo.email} 
                    disabled 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-email">New Email</Label>
                  <Input 
                    id="new-email" 
                    value={newEmail} 
                    onChange={(e) => setNewEmail(e.target.value)} 
                    placeholder="Enter new email"
                    type="email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="current-password-email">Current Password</Label>
                  <Input 
                    id="current-password-email" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    type="password"
                    placeholder="Verify with your password"
                  />
                </div>
                
                {emailUpdateStatus && (
                  <div className={`p-2 text-sm rounded ${
                    emailUpdateStatus.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {emailUpdateStatus.message}
                  </div>
                )}
                
                <Button 
                  onClick={handleEmailUpdate} 
                  disabled={isUpdating || !newEmail || !currentPassword}
                  className="w-full"
                >
                  {isUpdating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : <Save className="h-4 w-4 mr-2" />}
                  Update Email
                </Button>
              </div>
              
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-medium text-lg">Change Password</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input 
                    id="current-password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    type="password"
                    placeholder="Enter current password"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input 
                    id="new-password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type="password"
                    placeholder="Enter new password"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input 
                    id="confirm-password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type="password"
                    placeholder="Confirm new password"
                  />
                </div>
                
                {passwordUpdateStatus && (
                  <div className={`p-2 text-sm rounded ${
                    passwordUpdateStatus.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {passwordUpdateStatus.message}
                  </div>
                )}
                
                <Button 
                  onClick={handlePasswordUpdate} 
                  disabled={isUpdating || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full"
                >
                  {isUpdating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : <Save className="h-4 w-4 mr-2" />}
                  Update Password
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
