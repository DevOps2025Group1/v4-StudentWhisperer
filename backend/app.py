import os
import jwt
import logging
import clients.database_client as database_client
from auth import (
    require_azure_auth,
    token_required,
    exchange_azure_token,
)
from modules.chatbot import OpenAIChatbot
from flask import Flask, jsonify, request, session, make_response
from flask_session import Session
from dotenv import load_dotenv
from flask_cors import CORS
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
import tiktoken


ADMIN_USER_ID = 1

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

load_dotenv()
db = database_client.DatabaseClient()

app = Flask(__name__)
# Configure Session
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_PERMANENT"] = True
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_NAME"] = "flask_chat_session"
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-key")

Session(app)
CORS(app, supports_credentials=True)

TOKEN_ENCODER = tiktoken.encoding_for_model("gpt-4o")


@app.route("/api/health", methods=["GET"])
def health_check():
    """Simple health check endpoint"""
    return jsonify({"status": "OK", "message": "Backend API is running"})


@app.route("/api/auth/register", methods=["POST"])
def register():
    """Register a new user"""
    data = request.json

    # Validate input
    if (
        not data
        or not data.get("email")
        or not data.get("password")
        or not data.get("name")
    ):
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Missing required fields: email, password, name",
                }
            ),
            400,
        )

    email = data.get("email")
    name = data.get("name")

    # Check if user already exists
    if db.email_already_exist(email):
        return (
            jsonify(
                {"status": "error", "message": "User with this email already exists"}
            ),
            409,
        )

    # Hash the password before storing
    hashed_password = generate_password_hash(data.get("password"))

    student = db.add_new_student(name, email, hashed_password)

    # Generate JWT token, similar to login endpoint
    token_expiry = datetime.now() + timedelta(hours=24)
    token = jwt.encode(
        {"email": email, "name": name, "exp": token_expiry},
        app.config["SECRET_KEY"],
        algorithm="HS256",
    )

    response = make_response(
        jsonify(
            {
                "status": "success",
                "message": "User registered successfully",
                "token": token,
                "user": {
                    "email": student.email,
                    "name": student.name,
                    "student_id": student.student_id,
                },
            }
        ),
        201,
    )

    # Set user_id in http-only cookie
    response.set_cookie(
        "student_id",
        str(student.student_id),
        httponly=True,
        samesite="Lax",
        secure=False,
    )

    return response


@app.route("/api/auth/login", methods=["POST"])
def login():
    """Login a user"""
    data = request.json

    # Validate input
    if not data or not data.get("email") or not data.get("password"):
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Missing required fields: email, password",
                }
            ),
            400,
        )

    email = data.get("email")
    password = data.get("password")

    # Verify password
    student_id = db.check_user_login(email, password)
    if not student_id:
        return jsonify({"status": "error", "message": "Invalid email or password"}), 401

    # Fetch student info to get the name
    student_info = db.get_student_info(student_id)
    if not student_info:
        return jsonify({"status": "error", "message": "User data not found"}), 500

    student_name = student_info.name

    # Generate JWT token
    token_expiry = datetime.now() + timedelta(hours=24)
    token = jwt.encode(
        {"email": email, "name": student_name, "exp": token_expiry},
        app.config["SECRET_KEY"],
        algorithm="HS256",
    )

    response = make_response(
        jsonify(
            {
                "status": "success",
                "message": "Login successful",
                "token": token,
                "user": {
                    "email": email,
                    "student_id": student_id,
                    "name": student_name,
                },
            }
        )
    )

    # Set user_id in http-only to securely determine the current user
    response.set_cookie(
        "student_id", str(student_id), httponly=True, samesite="Lax", secure=False
    )

    return response


# Azure AD authentication endpoint
@app.route("/api/auth/azure-token", methods=["POST"])
def azure_login():
    """Exchange an Azure AD token for an application token"""

    result = exchange_azure_token(
        None
    )  # Token is extracted from the header in the function

    # If result is a tuple, it's an error response
    if isinstance(result, tuple):
        return result

    # Success response with token and user info
    return jsonify(
        {
            "status": "success",
            "message": "Azure AD authentication successful",
            "token": result["token"],
            "user": result["user"],
        }
    )


@app.route("/api/chat", methods=["POST"])
@token_required
def chat():
    data = request.json
    prompt = data.get("message", "")
    chatbot = OpenAIChatbot()

    student_id = request.cookies.get("student_id")

    chat_history = session.get("chat_history", [])
    response_content = chatbot.generate_response(prompt, student_id, chat_history)

    chat_history.append({"role": "user", "content": prompt})
    chat_history.append({"role": "assistant", "content": response_content})

    session["chat_history"] = chat_history[-10:]
    session.modified = True

    # Create response and explicitly set session cookie
    response = make_response(
        jsonify({"response": {"role": "assistant", "content": response_content}})
    )
    response.set_cookie(
        "flask_chat_session", session.sid, httponly=True, samesite="Lax", secure=False
    )

    input_tokens = TOKEN_ENCODER.encode(prompt)
    output_tokens = TOKEN_ENCODER.encode(response_content)
    total_tokens = len(input_tokens) + len(output_tokens)
    db.add_token_usage(student_id, total_tokens)

    return response


@app.route("/api/protected", methods=["GET"])
@require_azure_auth
def protected_endpoint():
    """Protected endpoint that requires Azure AD authentication"""
    # request.user is set by the @require_auth decorator
    user_info = {
        "name": request.user.get("name", "Unknown"),
        "email": request.user.get("preferred_username", "Unknown"),
        "sub": request.user.get("sub", "Unknown"),
    }

    return jsonify(
        {
            "status": "success",
            "message": "You have successfully accessed a protected endpoint!",
            "user_info": user_info,
        }
    )


# User account information endpoint
@app.route("/api/me", methods=["GET"])
@token_required
def get_user_info():
    """Get current user information"""
    return jsonify(
        {
            "status": "success",
            "user": {
                "email": request.current_user["email"],
                "name": request.current_user["name"],
                "auth_source": request.current_user.get("auth_source", "internal"),
            },
        }
    )


# Endpoint for collecting student courses
@app.route("/api/student/courses", methods=["GET"])
@app.route("/api/student/courses", methods=["GET"])
@token_required
def get_student_courses():
    try:
        student_id = request.cookies.get("student_id")
        if not student_id:
            return jsonify({"error": "Email parameter is required"}), 400

        student_info = db.get_student_info(student_id)
        if not student_info:
            return jsonify({"error": "Student not found"}), 404

        program_data = {
            "id": student_info.program.get("program_id", 0),
            "name": student_info.program.get("program_name", ""),
            "european_credits": student_info.program.get("program_ec", 180),
            "european_credits": student_info.program.get("program_ec", 180),
        }

        # Format the courses data from student_info
        formatted_grades = []
        for i, course in enumerate(student_info.courses):
            formatted_grade = {
                "id": i + 1,
                "course_id": course["id"],
                "course_id": course["id"],
                "grade": course["grade"],
                "feedback": course.get("feedback", ""),
                "created_at": str(course["created_at"]),
                "created_at": str(course["created_at"]),
                "course": {
                    "id": course["id"],
                    "id": course["id"],
                    "name": course["course_name"],
                    "european_credits": course["ec"],
                    "program_id": student_info.program.get("program_id", 0),
                },
            }
            formatted_grades.append(formatted_grade)

        return jsonify(
            {
                "name": student_info.name,
                "email": student_info.email,
                "program": program_data,
                "grades": formatted_grades,
            }
        )

    except Exception as e:
        logging.error(f"Error fetching student courses: {e}")
        return (
            jsonify(
                {"error": f"Server error while fetching student courses: {str(e)}"}
            ),
            500,
        )


@app.route("/api/metrics", methods=["GET"])
@token_required
def metrics():
    if request.cookies.get("student_id") != str(ADMIN_USER_ID):
        return jsonify({"error": "Not authorized"}), 403

    return jsonify(db.get_user_token_usage())


# Endpoint to update user email
@app.route("/api/student/update-email", methods=["PUT"])
@app.route("/api/student/update-email", methods=["PUT"])
@token_required
def update_email():
    try:
        data = request.json

        # Validate required input
        if (
            not data
            or not data.get("currentEmail")
            or not data.get("newEmail")
            or not data.get("password")
        ):
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Missing required fields: currentEmail, newEmail, password",
                    }
                ),
                400,
            )

        if (
            not data
            or not data.get("currentEmail")
            or not data.get("newEmail")
            or not data.get("password")
        ):
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Missing required fields: currentEmail, newEmail, password",
                    }
                ),
                400,
            )

        current_email = data.get("currentEmail")
        new_email = data.get("newEmail")
        password = data.get("password")

        # Verify the user owns this account (through token)
        if current_email != request.current_user["email"]:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Not authorized to update this account",
                    }
                ),
                403,
            )

            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Not authorized to update this account",
                    }
                ),
                403,
            )

        # Check if the new email already exists
        if db.email_already_exist(new_email) and new_email != current_email:
            return (
                jsonify({"status": "error", "message": "Email address already in use"}),
                409,
            )

            return (
                jsonify({"status": "error", "message": "Email address already in use"}),
                409,
            )

        # Verify the current password
        if not db.check_user_login(current_email, password):
            return jsonify({"status": "error", "message": "Invalid password"}), 401

        # Update the email in the database
        success = db.update_student_email(current_email, new_email)

        if not success:
            return (
                jsonify({"status": "error", "message": "Failed to update email"}),
                500,
            )

            return (
                jsonify({"status": "error", "message": "Failed to update email"}),
                500,
            )

        # Generate new JWT token with updated email
        token_expiry = datetime.now() + timedelta(hours=24)
        token = jwt.encode(
            {
                "email": new_email,
                "name": request.current_user["name"],
                "exp": token_expiry,
            },
            {
                "email": new_email,
                "name": request.current_user["name"],
                "exp": token_expiry,
            },
            app.config["SECRET_KEY"],
            algorithm="HS256",
        )

        return jsonify(
            {
                "status": "success",
                "message": "Email updated successfully",
                "token": token,
                "user": {"email": new_email, "name": request.current_user["name"]},
            }
        )

    except Exception as e:
        logging.error(f"Error updating email: {e}")
        return jsonify({"status": "error", "message": f"Server error: {str(e)}"}), 500


# Endpoint to update user password
@app.route("/api/student/update-password", methods=["PUT"])
@app.route("/api/student/update-password", methods=["PUT"])
@token_required
def update_password():
    try:
        data = request.json

        # Validate required input
        if (
            not data
            or not data.get("email")
            or not data.get("currentPassword")
            or not data.get("newPassword")
        ):
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Missing required fields: email, currentPassword, newPassword",
                    }
                ),
                400,
            )

        if (
            not data
            or not data.get("email")
            or not data.get("currentPassword")
            or not data.get("newPassword")
        ):
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Missing required fields: email, currentPassword, newPassword",
                    }
                ),
                400,
            )

        email = data.get("email")
        current_password = data.get("currentPassword")
        new_password = data.get("newPassword")

        # Verify the user owns this account (through token)
        if email != request.current_user["email"]:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Not authorized to update this account",
                    }
                ),
                403,
            )

        # Verify the current password
        if not db.check_user_login(email, current_password):
            return (
                jsonify(
                    {"status": "error", "message": "Current password is incorrect"}
                ),
                401,
            )

        # Hash the new password
        hashed_password = generate_password_hash(new_password)

        # Update the password in the database
        success = db.update_student_password(email, hashed_password)

        if not success:
            return (
                jsonify({"status": "error", "message": "Failed to update password"}),
                500,
            )

        return jsonify(
            {"status": "success", "message": "Password updated successfully"}
        )

    except Exception as e:
        logging.error(f"Error updating password: {e}")
        return jsonify({"status": "error", "message": f"Server error: {str(e)}"}), 500
