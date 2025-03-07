// Define interfaces for the student profile data
export interface Course {
  id: string | number;
  name: string;
  grade: number;
}

export interface StudentProfile {
  name: string;
  email: string;
  courses: Course[];
}

/**
 * Fetches the student profile from the API
 * @returns Promise with the student profile data
 */
export async function fetchStudentProfile(): Promise<StudentProfile> {
  try {
    // Replace with actual API call
    const response = await fetch('/api/student/profile');
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data: StudentProfile = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching student profile:', error);
    throw error;
  }
}
