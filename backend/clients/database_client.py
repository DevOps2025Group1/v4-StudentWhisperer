from typing import Optional
from modules.student import Student
from werkzeug.security import check_password_hash
import pyodbc
import os


class DatabaseClient:
    def __init__(self):
        """Initialize the database connection using Streamlit secrets."""
        self.conn = self._init_connection()

    def _init_connection(self):
        """Initialize and return a database connection using credentials from st.secrets."""
        connection_str = (
            "DRIVER={ODBC Driver 17 for SQL Server};"
            "SERVER=" + os.environ["SQL_SERVER"] + ";"
            "DATABASE=" + os.environ["SQL_DB"] + ";"
            "UID=" + os.environ["SQL_USER"] + ";"
            "PWD=" + os.environ["SQL_PASSWORD"]
        )
        return pyodbc.connect(connection_str)

    def get_student_info(self, email: str) -> Optional[Student]:
        """Retrieve student information including courses, grades, and program."""
        query = """
        SELECT s.id, s.name, s.email, c.name, g.grade, c.european_credits, c.id, g.created_at, g.feedback,
               p.id, p.name, p.european_credits 
        FROM dbo.Student s
        JOIN dbo.Grade g ON s.id = g.student_id
        JOIN dbo.Course c ON g.course_id = c.id
        JOIN dbo.Program p ON s.program_id = p.id
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
            "european_credits": results[0][11]
        }

        return Student(student_id, name, email, courses, program)


    def add_new_student(self, name: str, email: str, password: str, program_id: int = None) -> Student:
        """Add a new student to the database."""
        query = """
        INSERT INTO dbo.Student (name, email, password, program_id)
        OUTPUT INSERTED.id
        VALUES (?, ?, ?, ?);
        """

        with self.conn.cursor() as cursor:
            cursor.execute(query, (name, email, password, program_id))
            student_id = cursor.fetchone()[0]
            cursor.commit()

        program = None
        if program_id:
            program_query = "SELECT id, name FROM dbo.Program WHERE id = ?;"
            cursor.execute(program_query, (program_id,))
            prog_result = cursor.fetchone()
            if prog_result:
                program = {
                    "program_id": prog_result[0],
                    "program_name": prog_result[1]
                }

        return Student(student_id, name, email, [], program)

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
