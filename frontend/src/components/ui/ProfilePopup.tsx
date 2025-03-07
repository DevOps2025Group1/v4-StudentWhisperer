import * as React from "react"
import { fetchStudentProfile, StudentProfile } from '@/services/studentService';

// Define types for the profile data
// interface Course {
//   id: string | number;
//   name: string;
//   grade: number;
// }

// interface StudentProfile {
//   name: string;
//   email: string;
//   courses: Course[];
// }

interface ProfilePopupProps {
  onClose: () => void;
}

const ProfilePopup: React.FC<ProfilePopupProps> = ({ onClose }) => {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [profile, setProfile] = React.useState<StudentProfile | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const getProfile = async () => {
      try {
        const data = await fetchStudentProfile();
        setProfile(data);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError('Could not load profile data');
      } finally {
        setLoading(false);
      }
    };

    getProfile();

    // Close popup when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.profile-popup') && !target.closest('.profile-icon')) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Function to determine grade color
  const getGradeColorClass = (grade: number): string => {
    if (grade >= 8) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    if (grade >= 6) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  };

  if (loading) {
    return (
      <div className="profile-popup">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-popup">
        <div className="text-destructive text-center p-4">{error}</div>
      </div>
    );
  }

  return (
    <div className="profile-popup">
      <div className="profile-popup-header">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        <div>
          <h3 className="font-semibold">{profile?.name}</h3>
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
        </div>
      </div>

      <div className="profile-popup-courses">
        <h4 className="text-sm font-medium mb-2">Your Courses</h4>
        {profile?.courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No courses enrolled</p>
        ) : (
          profile?.courses.map((course) => (
            <div key={course.id} className="course-item">
              <span className="text-sm">{course.name}</span>
              <span className={`course-grade ${getGradeColorClass(course.grade)}`}>
                {course.grade.toFixed(1)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export { ProfilePopup };
