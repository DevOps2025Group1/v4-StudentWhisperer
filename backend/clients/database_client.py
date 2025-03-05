# db_connector.py
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


