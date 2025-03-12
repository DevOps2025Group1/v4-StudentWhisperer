from typing import Optional
from modules.student import Student
from werkzeug.security import check_password_hash
import pyodbc
import os
import random


class DatabaseClient:
    def __init__(self):
        """Initialize the database connection using Streamlit secrets."""
        self.conn = self._init_connection()

    def _init_connection(self):
        """Initialize and return a database connection using credentials from st.secrets."""
        connection_str = (
            "DRIVER={ODBC Driver 17 for SQL Server};"
            "SERVER=" + os.environ["sql-server"] + ";"
            "DATABASE=" + os.environ["sql-db"] + ";"
            "UID=" + os.environ["sql-user"] + ";"
            "PWD=" + os.environ["sql-password"]
        )
        return pyodbc.connect(connection_str)

    def get_student_info(self, email: str) -> Optional[Student]:
        """Retrieve student information including courses, grades, and program."""
        query = """
        SELECT s.id, s.name, s.email, c.name, g.grade, c.european_credits, c.id, g.created_at, g.feedback,
               p.id, p.name, p.european_credits 
        FROM dbo.Student s
        LEFT JOIN dbo.Grade g ON s.id = g.student_id
        LEFT JOIN dbo.Course c ON g.course_id = c.id
        LEFT JOIN dbo.Program p ON s.program_id = p.id
        WHERE s.email = ?;
        """

        with self.conn.cursor() as cursor:
            cursor.execute(query, (email,))
            results = cursor.fetchall()

        if not results:
            return None

        student_id, name, email = results[0][:3]
        courses = [{"course_name": row[3], "grade": row[4], "ec": row[5], "id": row[6], "created_at": row[7], "feedback": row[8]} for row in results]
        program = {
            "program_id": results[0][9],
            "program_name": results[0][10], 
            "program_ec": results[0][11]
        }

        return Student(student_id, name, email, courses, program)

    def add_new_student(self, name: str, email: str, password: str) -> Student:
        """Add a new student to the database."""
        query = """
        INSERT INTO dbo.Student (name, email, password)
        OUTPUT INSERTED.id
        VALUES (?, ?, ?);
        """

        with self.conn.cursor() as cursor:
            cursor.execute(query, (name, email, password))
            student_id = cursor.fetchone()[0]
            cursor.commit()
            
        self.add_demo_student_data(student_id)

        return Student(student_id, name, email)
    
    def add_demo_student_data(self, student_id: int):
        """Connect demo courses and grades to the specified student."""

        # Get all courses connected to the current students program
        query = """
        SELECT c.id
        FROM dbo.Course c
        WHERE c.program_id = (
            SELECT s.program_id
            FROM dbo.Student s
            WHERE s.id = ?
        );
        """
        with self.conn.cursor() as cursor:
            cursor.execute(query, (student_id,))
            course_ids = [row[0] for row in cursor.fetchall()]

        # Randomly select a subset of courses, and generate random grades
        courses = random.sample(course_ids, random.randint(1, len(course_ids)))
        grades = [(student_id, course, random.randint(4, 10)) for course in courses]

        # Insert demo grades for the student
        query = """
        INSERT INTO dbo.Grade (student_id, course_id, grade)
        VALUES (?, ?, ?);
        """
        with self.conn.cursor() as cursor:
            cursor.executemany(query, grades)
            cursor.commit()

    def check_user_login(self, email: str, password: str):
        query = """
        SELECT name, password
        FROM dbo.Student
        WHERE email = ?;
        """

        with self.conn.cursor() as cursor:
            cursor.execute(query, (email,))
            result = cursor.fetchone()

            return check_password_hash(result[1], password)

        if not result:
            return False

        return True

    def email_already_exist(self, email: str):
        query = """
        SELECT id
        FROM dbo.Student
        WHERE email = ?;
        """

        with self.conn.cursor() as cursor:
            cursor.execute(query, (email,))
            result = cursor.fetchone()

        if not result:
            return False

        return True

    def add_to_chat_hostory():
        pass

    def get_chat_history():
        pass
