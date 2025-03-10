from modules.chatbot import OpenAIChatbot
from flask import Flask, jsonify, request
from dotenv import load_dotenv
from flask_cors import CORS
import os
import jwt
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import logging
import clients.database_client as database_client
from auth import verify_token, require_auth, token_required


load_dotenv()
db = database_client.DatabaseClient()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Secret key for JWT tokens - in production, use environment variables
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-key")

# Sample data - in a real app, this might come from a database
sample_messages = [
    {"id": "1", "role": "assistant", "content": "Hello! How can I help you today?"},
    {"id": "2", "role": "user", "content": "Tell me about your API endpoints."},
    {
        "id": "3",
        "role": "assistant",
        "content": "I have several test endpoints available. You can use /api/messages to get sample messages, /api/echo to echo back your input, and /api/health to check the API status.",
    },
]


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

    return (
        jsonify(
            {
                "status": "success",
                "message": "User registered successfully",
                "user": {
                    "email": student.email,
                    "name": student.name,
                    "id": student.student_id,
                },
            }
        ),
        201,
    )


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
    if not db.check_user_login(email, password):
        return jsonify({"status": "error", "message": "Invalid email or password"}), 401

    # Generate JWT token
    token_expiry = datetime.utcnow() + timedelta(hours=24)
    token = jwt.encode(
        {"email": email, "name": email, "exp": token_expiry},
        app.config["SECRET_KEY"],
        algorithm="HS256",
    )

    return jsonify(
        {
            "status": "success",
            "message": "Login successful",
            "token": token,
            "user": {"email": email, "name": email},
        }
    )


# Public endpoints - no authentication required
@app.route("/api/messages", methods=["GET"])
def get_messages():
    """Return sample messages"""
    return jsonify({"messages": sample_messages})


# Protected endpoints - authentication required


@app.route("/api/echo", methods=["POST"])
@token_required
def echo():
    """Echo back the request data"""
    data = request.json
    # Include user info in the response
    return jsonify(
        {
            "status": "success",
            "message": "Echoed back data",
            "data": data,
            "user": {
                "email": request.current_user["email"],
                "name": request.current_user["name"],
            },
        }
    )


@app.route("/api/chat", methods=["POST"])
@token_required
def chat():
    """Simulate a chat response - requires authentication"""
    data = request.json
    prompt = data.get("message", "")
    chatbot = OpenAIChatbot()

    # You can use the user info in request.current_user for personalized responses
    user_email = request.current_user["email"]

    response = {
        "role": "assistant",
        "content": chatbot.generate_response(prompt),
        "user": user_email,  # Optionally include user info in the response
    }

    return jsonify({"response": response})


# New protected endpoint using Azure AD authentication
@app.route("/api/protected", methods=["GET"])
@require_auth
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
            },
        }
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
