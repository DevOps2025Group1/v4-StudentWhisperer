# Add this to your existing app.py where other routes are defined

# Add these imports if they're not already there
from flask import jsonify, g
from app.models import Student, Course, Enrollment

# Add this route to your existing Flask app
@app.route('/api/student/profile', methods=['GET'])
@login_required
def get_student_profile():
    """Get current student profile with courses and grades"""
    # Access logged-in student from session/token
    student_id = g.user.id  # Assuming your auth middleware puts user in g.user
    
    # Query student with courses and grades
    student = Student.query.filter_by(id=student_id).first()
    if not student:
        return jsonify({"error": "Student not found"}), 404
    
    # Get enrollments with courses and grades
    enrollments = (
        Enrollment.query
        .filter_by(student_id=student_id)
        .join(Course)
        .all()
    )
    
    courses = []
    for enrollment in enrollments:
        courses.append({
            "id": enrollment.course.id,
            "name": enrollment.course.name,
            "grade": enrollment.grade
        })
    
    # Return student profile with courses
    return jsonify({
        "id": student.id,
        "name": f"{student.first_name} {student.last_name}",
        "email": student.email,
        "courses": courses
    })
