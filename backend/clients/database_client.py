from typing import Optional
from modules.student import Student
from werkzeug.security import check_password_hash
import pyodbc
import os
import random
from datetime import datetime


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

    def get_student_info(self, student_id: int) -> Optional[Student]:
        """Retrieve student information including courses, grades, and program."""
        query = """
        SELECT s.id, s.name, s.email, c.name, g.grade, c.european_credits, c.id, g.created_at, g.feedback,
               p.id, p.name, p.european_credits
        FROM dbo.Student s
        LEFT JOIN dbo.Grade g ON s.id = g.student_id
        LEFT JOIN dbo.Course c ON g.course_id = c.id
        LEFT JOIN dbo.Program p ON s.program_id = p.id
        WHERE s.id = ?;
        """

        with self.conn.cursor() as cursor:
            cursor.execute(query, (student_id,))
            results = cursor.fetchall()

        if not results:
            return None

        student_id, name, email = results[0][:3]
        courses = [
            {
                "course_name": row[3],
                "grade": row[4],
                "ec": row[5],
                "id": row[6],
                "created_at": row[7],
                "feedback": row[8],
            }
            for row in results
        ]
        program = {
            "program_id": results[0][9],
            "program_name": results[0][10],
            "program_ec": results[0][11],
        }

        return Student(student_id, name, email, courses, program)

    def add_new_student(
        self, name: str, email: str, password_hash: str = None
    ) -> Student:
        """
        Add a new student to the database. Password hash is optional for SSO users.
        """
        try:
            # Check if a student with this email already exists
            if self.email_already_exist(email):
                raise ValueError(f"Student with email {email} already exists")

            # Insert into Student table with possibly null password for SSO users
            query = """
            INSERT INTO dbo.Student (name, email, password)
            VALUES (?, ?, ?);
            """

            with self.conn.cursor() as cursor:
                cursor.execute(query, (name, email, password_hash))
                student_id = cursor.execute("SELECT SCOPE_IDENTITY();").fetchval()
                cursor.commit()

                # Create empty initial data
                empty_courses = []
                empty_program = {}

                # Create and return a new Student object
                return Student(student_id, name, email, empty_courses, empty_program)

        except Exception as e:
            print(f"Error adding new student: {e}")
            raise

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
        SELECT name, password, id
        FROM dbo.Student
        WHERE email = ?;
        """

        with self.conn.cursor() as cursor:
            cursor.execute(query, (email,))
            result = cursor.fetchone()

            if check_password_hash(result[1], password):
                return result[2]

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

    def get_monthly_token_usage(self, year=None, month=None):
        """Get token usage per user for a specific month
        If year and month are not provided, returns current month's data
        """
        if year is None or month is None:
            current_date = datetime.now()
            year = current_date.year
            month = current_date.month

        query = """
        SELECT s.id, s.email, s.name, COALESCE(SUM(tu.tokens), 0) AS total_tokens_used
        FROM dbo.student s
        INNER JOIN Tokenusage tu
            ON s.id = tu.student_id
            AND YEAR(tu.date_time) = ?
            AND MONTH(tu.date_time) = ?
        GROUP BY s.id, s.email, s.name
        ORDER BY s.id;
        """

        with self.conn.cursor() as cursor:
            cursor.execute(query, (year, month))
            results = cursor.fetchall()

        return [
            {
                "student_id": row[0],
                "email": row[1],
                "name": row[2],
                "tokens_used": row[3],
            }
            for row in results
        ]

    def get_user_token_usage(self):
        """Get token usage for all users in the last 24 hours"""
        query = """
        SELECT s.email, SUM(tu.tokens) AS total_tokens_used
        FROM dbo.student s
        INNER JOIN Tokenusage tu
            ON s.id = tu.student_id
        WHERE tu.date_time >= DATEADD(HOUR, -24, GETDATE())
        GROUP BY s.email;
        """

        with self.conn.cursor() as cursor:
            cursor.execute(query)
            results = cursor.fetchall()

        # Return results in a dictionary format
        return {row[0]: row[1] for row in results}

    def add_token_usage(self, student_id: int, tokens: int):
        query = """
        INSERT INTO Tokenusage (student_id, tokens)
        VALUES (?, ?);
        """

        with self.conn.cursor() as cursor:
            cursor.execute(query, (student_id, tokens))
            cursor.commit()

    def get_active_users_count(self):
        """Get count of active users in the system (all registered students)"""
        query = """
        SELECT COUNT(id) FROM dbo.Student;
        """

        with self.conn.cursor() as cursor:
            cursor.execute(query)
            result = cursor.fetchone()

        return result[0] if result else 0

    def set_global_token_limit(self, monthly_limit: int):
        """Set global token limit for all users"""
        # First check if we have a token_settings table
        check_query = """
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TokenSettings')
        BEGIN
            CREATE TABLE TokenSettings (
                id INT PRIMARY KEY IDENTITY(1,1),
                setting_name VARCHAR(100) NOT NULL,
                setting_value INT NOT NULL,
                updated_at DATETIME DEFAULT GETDATE()
            );
        END
        """

        with self.conn.cursor() as cursor:
            cursor.execute(check_query)
            cursor.commit()

        # Now update or insert the global limit
        upsert_query = """
        MERGE INTO TokenSettings AS target
        USING (SELECT 'monthly_global_limit' AS setting_name, ? AS setting_value) AS source
        ON target.setting_name = source.setting_name
        WHEN MATCHED THEN
            UPDATE SET target.setting_value = source.setting_value, target.updated_at = GETDATE()
        WHEN NOT MATCHED THEN
            INSERT (setting_name, setting_value)
            VALUES (source.setting_name, source.setting_value);
        """

        with self.conn.cursor() as cursor:
            cursor.execute(upsert_query, (monthly_limit,))
            cursor.commit()

        return True

    def get_global_token_limit(self):
        """Get the current global monthly token limit"""
        # First check if we have a token_settings table
        check_query = """
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TokenSettings')
        BEGIN
            CREATE TABLE TokenSettings (
                id INT PRIMARY KEY IDENTITY(1,1),
                setting_name VARCHAR(100) NOT NULL,
                setting_value INT NOT NULL,
                updated_at DATETIME DEFAULT GETDATE()
            );

            INSERT INTO TokenSettings (setting_name, setting_value)
            VALUES ('monthly_global_limit', 1000000);
        END
        """

        with self.conn.cursor() as cursor:
            cursor.execute(check_query)
            cursor.commit()

        query = """
        SELECT setting_value FROM TokenSettings
        WHERE setting_name = 'monthly_global_limit';
        """

        with self.conn.cursor() as cursor:
            cursor.execute(query)
            result = cursor.fetchone()

        return result[0] if result else 1000000  # Default to 1 million tokens

    def get_user_monthly_usage(self, student_id: int, year=None, month=None):
        """Get token usage for a specific user in the current month"""
        if year is None or month is None:
            current_date = datetime.now()
            year = current_date.year
            month = current_date.month

        query = """
        SELECT COALESCE(SUM(tokens), 0) AS monthly_usage
        FROM Tokenusage
        WHERE student_id = ? AND YEAR(date_time) = ? AND MONTH(date_time) = ?;
        """

        with self.conn.cursor() as cursor:
            cursor.execute(query, (student_id, year, month))
            result = cursor.fetchone()

        return result[0] if result and result[0] is not None else 0

    def get_user_token_limit(self, student_id: int):
        """Calculate a user's token limit based on the global limit and active user count"""
        global_limit = self.get_global_token_limit()
        active_users = self.get_active_users_count()

        if active_users <= 0:
            active_users = 1  # Prevent division by zero

        # Equal distribution among users
        per_user_limit = global_limit // active_users

        return per_user_limit

    def can_user_use_tokens(self, student_id: int, required_tokens: int):
        """Check if a user can use the specified number of tokens"""
        # Get user's monthly limit
        user_limit = self.get_user_token_limit(student_id)

        # Get user's current usage this month
        current_usage = self.get_user_monthly_usage(student_id)

        # Calculate what the total would be after this request
        total_after_request = current_usage + required_tokens

        # Allow the request if the user hasn't exceeded their limit
        return total_after_request <= user_limit

    def update_student_email(self, current_email: str, new_email: str) -> bool:
        """Update a student's email address

        Args:
            current_email: The student's current email
            new_email: The new email to set

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            query = """
            UPDATE dbo.Student
            SET email = ?
            WHERE email = ?;
            """
            with self.conn.cursor() as cursor:
                cursor.execute(query, (new_email, current_email))
                affected_rows = cursor.rowcount
                cursor.commit()

            return affected_rows > 0
        except Exception as e:
            print(f"Error updating email: {e}")
            return False

    def update_student_password(self, email: str, hashed_password: str) -> bool:
        """Update a student's password

        Args:
            email: The student's email
            hashed_password: The new password hash to set

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            query = """
            UPDATE dbo.Student
            SET password = ?
            WHERE email = ?;
            """
            with self.conn.cursor() as cursor:
                cursor.execute(query, (hashed_password, email))
                affected_rows = cursor.rowcount
                cursor.commit()

            return affected_rows > 0
        except Exception as e:
            print(f"Error updating password: {e}")
            return False

    def get_student_id_by_email(self, email: str) -> int:
        """
        Get a student's ID by their email address
        """
        try:
            # Get student ID from Student table
            query = "SELECT id FROM dbo.Student WHERE email = ?;"
            with self.conn.cursor() as cursor:
                cursor.execute(query, (email,))
                result = cursor.fetchone()
                return result[0] if result else None
        except Exception as e:
            print(f"Error getting student ID by email: {e}")
            return None

    def get_cached_token_usage(self, student_id: int):
        """Get cached token usage data for an SSO user"""
        try:
            # Check if we have a token_usage_cache table
            check_query = """
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TokenUsageCache')
            BEGIN
                CREATE TABLE TokenUsageCache (
                    student_id INT NOT NULL,
                    usage INT NOT NULL,
                    limit_value INT NOT NULL,
                    percentage_used FLOAT NOT NULL,
                    last_updated DATETIME DEFAULT GETDATE(),
                    PRIMARY KEY (student_id)
                );
            END
            """
            with self.conn.cursor() as cursor:
                cursor.execute(check_query)
                cursor.commit()

            # Get cached data if it exists and is less than 5 minutes old
            query = """
            SELECT usage, limit_value, percentage_used
            FROM TokenUsageCache
            WHERE student_id = ?
            AND last_updated >= DATEADD(MINUTE, -5, GETDATE());
            """
            with self.conn.cursor() as cursor:
                cursor.execute(query, (student_id,))
                result = cursor.fetchone()

                if result:
                    return {
                        "usage": result[0],
                        "limit": result[1],
                        "percentage_used": result[2],
                    }
                return None

        except Exception as e:
            print(f"Error getting cached token usage: {e}")
            return None

    def cache_token_usage(self, student_id: int, usage_data: dict):
        """Cache token usage data for an SSO user"""
        try:
            # First ensure the table exists
            check_query = """
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TokenUsageCache')
            BEGIN
                CREATE TABLE TokenUsageCache (
                    student_id INT NOT NULL,
                    usage INT NOT NULL,
                    limit_value INT NOT NULL,
                    percentage_used FLOAT NOT NULL,
                    last_updated DATETIME DEFAULT GETDATE(),
                    PRIMARY KEY (student_id)
                );
            END
            """

            # Then upsert the data
            upsert_query = """
            MERGE TokenUsageCache AS target
            USING (SELECT ? as student_id, ? as usage, ? as limit_value, ? as percentage_used) AS source
            ON (target.student_id = source.student_id)
            WHEN MATCHED THEN
                UPDATE SET
                    usage = source.usage,
                    limit_value = source.limit_value,
                    percentage_used = source.percentage_used,
                    last_updated = GETDATE()
            WHEN NOT MATCHED THEN
                INSERT (student_id, usage, limit_value, percentage_used)
                VALUES (source.student_id, source.usage, source.limit_value, source.percentage_used);
            """

            with self.conn.cursor() as cursor:
                # Ensure table exists
                cursor.execute(check_query)
                cursor.commit()

                # Insert/update the data
                cursor.execute(
                    upsert_query,
                    (
                        student_id,
                        usage_data["usage"],
                        usage_data["limit"],
                        usage_data["percentage_used"],
                    ),
                )
                cursor.commit()

            return True
        except Exception as e:
            print(f"Error caching token usage: {e}")
            return False
