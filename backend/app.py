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


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    """Logout endpoint to clear session cookies"""
    response = make_response(
        jsonify({"status": "success", "message": "Logged out successfully"})
    )

    # Clear all session cookies
    response.delete_cookie("student_id")
    response.delete_cookie("flask_chat_session")

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

    # Get student_id from cookie and ensure it's an integer
    student_id = request.cookies.get("student_id")

    # Verify student_id is valid
    if not student_id:
        logging.error("Chat error: No student_id in cookies")
        return jsonify({"error": "Authentication required. Please log in again."}), 401

    try:
        # Convert to integer to make sure it's valid
        student_id = int(student_id)
    except (TypeError, ValueError):
        logging.error(f"Chat error: Invalid student_id: {student_id}")
        return jsonify({"error": "Invalid user session. Please log in again."}), 401

    # Check if user has reached their token limit
    # First, we need to estimate tokens for this request
    input_tokens = len(TOKEN_ENCODER.encode(prompt))
    estimated_tokens = input_tokens * 4  # Rough estimate for total (input + output)

    # Check if user can use these tokens
    if not db.can_user_use_tokens(student_id, estimated_tokens):
        return (
            jsonify(
                {
                    "error": "token_limit_reached",
                    "message": "You have reached your monthly token limit",
                }
            ),
            403,
        )

    chat_history = session.get("chat_history", [])

    try:
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
            "flask_chat_session",
            session.sid,
            httponly=True,
            samesite="Lax",
            secure=False,
        )

        # Calculate and record token usage
        output_tokens = len(TOKEN_ENCODER.encode(response_content))
        total_tokens = input_tokens + output_tokens
        db.add_token_usage(student_id, total_tokens)

        print(
            f"Student {student_id} used {total_tokens} tokens.",
            flush=True,
        )

        return response

    except Exception as e:
        # Even if the request fails, we should still track the input tokens
        # Only track tokens if student_id is valid
        if isinstance(student_id, int):
            db.add_token_usage(student_id, input_tokens)
            print(
                f"Student {student_id} used {input_tokens} tokens (failed request).",
                flush=True,
            )

        logging.error(f"Chat error: {str(e)}")
        return jsonify({"error": f"Error processing request: {str(e)}"}), 500


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
        }

        # Format the courses data from student_info
        formatted_grades = []
        for i, course in enumerate(student_info.courses):
            formatted_grade = {
                "id": i + 1,
                "course_id": course["id"],
                "grade": course["grade"],
                "feedback": course.get("feedback", ""),
                "created_at": str(course["created_at"]),
                "course": {
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


@app.route("/api/tokens/usage", methods=["GET"])
@token_required
def get_token_usage():
    """Get token usage for the current user"""
    try:
        student_id = request.cookies.get("student_id")
        if not student_id:
            return jsonify({"error": "User not authenticated"}), 401

        # Get current month's usage for this user
        current_usage = db.get_user_monthly_usage(student_id)

        # Get the user's token limit
        user_limit = db.get_user_token_limit(student_id)

        # Calculate percentage used
        percentage_used = 0
        if user_limit > 0:
            percentage_used = min(100, round((current_usage / user_limit) * 100, 1))

        return jsonify(
            {
                "usage": current_usage,
                "limit": user_limit,
                "percentage_used": percentage_used,
            }
        )

    except Exception as e:
        logging.error(f"Error getting token usage: {e}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/api/admin/tokens/usage", methods=["GET"])
@token_required
def get_admin_token_usage():
    """Get token usage for all users (admin only)"""
    try:
        student_id = request.cookies.get("student_id")
        if str(student_id) != str(ADMIN_USER_ID):
            return jsonify({"error": "Not authorized"}), 403

        # Get year and month from query params, if provided
        year = request.args.get("year", type=int)
        month = request.args.get("month", type=int)

        # Get usage data for all users
        usage_data = db.get_monthly_token_usage(year, month)

        # Get global limit and active users count
        global_limit = db.get_global_token_limit()
        active_users = db.get_active_users_count()

        return jsonify(
            {
                "global_limit": global_limit,
                "active_users": active_users,
                "usage_data": usage_data,
            }
        )

    except Exception as e:
        logging.error(f"Error getting admin token usage: {e}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/api/admin/tokens/limit", methods=["GET"])
@token_required
def get_token_limit():
    """Get the current global token limit (admin only)"""
    try:
        student_id = request.cookies.get("student_id")
        if str(student_id) != str(ADMIN_USER_ID):
            return jsonify({"error": "Not authorized"}), 403

        # Get global limit
        global_limit = db.get_global_token_limit()

        # Get active users count
        active_users = db.get_active_users_count()

        # Calculate per user limit
        per_user_limit = global_limit
        if active_users > 0:
            per_user_limit = global_limit // active_users

        return jsonify(
            {
                "global_limit": global_limit,
                "active_users": active_users,
                "per_user_limit": per_user_limit,
                "status": "success",
            }
        )

    except Exception as e:
        logging.error(f"Error getting token limit: {e}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/api/admin/tokens/limit", methods=["POST"])
@token_required
def set_token_limit():
    """Set the global token limit (admin only)"""
    try:
        student_id = request.cookies.get("student_id")
        if str(student_id) != str(ADMIN_USER_ID):
            return jsonify({"error": "Not authorized"}), 403

        data = request.json
        if not data or not data.get("limit"):
            return jsonify({"error": "Missing required field: limit"}), 400

        limit = int(data.get("limit"))
        if limit <= 0:
            return jsonify({"error": "Limit must be a positive number"}), 400

        # Update the global limit
        db.set_global_token_limit(limit)

        # Get active users count for response
        active_users = db.get_active_users_count()

        # Calculate per user limit
        per_user_limit = limit
        if active_users > 0:
            per_user_limit = limit // active_users

        return jsonify(
            {
                "global_limit": limit,
                "active_users": active_users,
                "per_user_limit": per_user_limit,
                "status": "success",
            }
        )

    except Exception as e:
        logging.error(f"Error setting token limit: {e}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/api/metrics", methods=["GET"])
@token_required
def metrics():
    if request.cookies.get("student_id") != str(ADMIN_USER_ID):
        return jsonify({"error": "Not authorized"}), 403

    return jsonify(db.get_user_token_usage())


# Endpoint to update user email
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

        # Check if the new email already exists
        if db.email_already_exist(new_email) and new_email != current_email:
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

        # Generate new JWT token with updated email
        token_expiry = datetime.now() + timedelta(hours=24)
        token = jwt.encode(
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


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
