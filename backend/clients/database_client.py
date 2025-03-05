from typing import Optional
from modules.student import Student
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
        """Retrieve student information including courses and grades."""
        query = '''
        SELECT s.id, s.name, s.email, c.name AS course_name, g.grade, g.created_at, g.feedback
        FROM dbo.Student s
        JOIN dbo.Grade g ON s.id = g.student_id
        JOIN dbo.Course c ON g.course_id = c.id
        WHERE s.email = ?;
        '''

        with self.conn.cursor() as cursor:
            cursor.execute(query, (email,))
            results = cursor.fetchall()

        if not results:
            return None

        student_id, name, email = results[0][:3]
        courses = [{"course_name": row[3], "grade": row[4]} for row in results]

        return Student(student_id, name, email, courses)

    def add_new_student(self, name: str, email: str, password: str) -> Student:
        """Add a new student to the database."""
        query = '''
        INSERT INTO dbo.Student (name, email, password)
        OUTPUT INSERTED.id
        VALUES (?, ?, ?);
        '''

        with self.conn.cursor() as cursor:
            cursor.execute(query, (name, email, password))
            student_id = cursor.fetchone()[0]
            cursor.commit()

        return Student(student_id, name, email, [])

    def check_user_login(email: str, password_hash: str):
        query = '''
        SELECT id, name, email
        FROM dbo.Student
        WHERE email = ? AND password = ?;
        '''
        
        with self.conn.cursor() as cursor:
            cursor.execute(query, (email, password_hash))
            result = cursor.fetchone()

        if not result:
            return False

        return True

    def email_already_exist(email: str):
        query = '''
        SELECT id
        FROM dbo.Student
        WHERE email = ?;
        '''
        
        with self.conn.cursor() as cursor:
            cursor.execute(query, (email,))
            result = cursor.fetchone()

        if not result:
            return False

        return True


