import { Button } from "@/components/ui/button";
import { X, BookOpen } from "lucide-react";

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

interface StudentInfo {
  name: string;
  email: string;
  program?: Program;
  grades: Grade[];
}

interface ProfilePopupProps {
  studentInfo: StudentInfo | null;
  isLoading: boolean;
  onClose: () => void;
}

export function ProfilePopup({ studentInfo, isLoading, onClose }: ProfilePopupProps) {
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
      <div className="bg-background rounded-lg shadow-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-background pt-2">
          <h2 className="text-xl font-bold">Student Profile</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
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
      </div>
    </div>
  );
}
