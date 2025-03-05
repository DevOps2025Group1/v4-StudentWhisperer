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


load_dotenv()
db = database_client.DatabaseClient()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Secret key for JWT tokens - in production, use environment variables
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')

# Sample data - in a real app, this might come from a database
sample_messages = [
    {"id": "1", "role": "assistant", "content": "Hello! How can I help you today?"},
    {"id": "2", "role": "user", "content": "Tell me about your API endpoints."},
    {"id": "3", "role": "assistant", "content": "I have several test endpoints available. You can use /api/messages to get sample messages, /api/echo to echo back your input, and /api/health to check the API status."}
]

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({"status": "OK", "message": "Backend API is running"})

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.json
    
    # Validate input
    if not data or not data.get('email') or not data.get('password') or not data.get('name'):
        return jsonify({
            "status": "error",
            "message": "Missing required fields: email, password, name"
        }), 400
    
    email = data.get('email')
    name = data.get('name')
    
    # Check if user already exists
    if db.email_already_exist(email):
        return jsonify({
            "status": "error",
            "message": "User with this email already exists"
        }), 409
    
    # Hash the password before storing
    hashed_password = generate_password_hash(data.get('password'))

    student = db.add_new_student(name, email, hashed_password)
    
    return jsonify({
        "status": "success",
        "message": "User registered successfully",
        "user": {
            "email": student.email,
            "name": student.name,
            "id": student.student_id
        }
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login a user"""
    data = request.json
    
    # Validate input
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({
            "status": "error",
            "message": "Missing required fields: email, password"
        }), 400
    
    email = data.get('email')
    password = data.get('password')
    
    # Verify password
    if not db.check_user_login(email, password):
        return jsonify({
            "status": "error",
            "message": "Invalid email or password"
        }), 401
    
    # Generate JWT token
    token_expiry = datetime.utcnow() + timedelta(hours=24)
    token = jwt.encode({
        'email': email,
        'name': email,
        'exp': token_expiry
    }, app.config['SECRET_KEY'])
    
    return jsonify({
        "status": "success",
        "message": "Login successful",
        "token": token,
        "user": {
            "email": email,
            "name": email
        }
    })

@app.route('/api/messages', methods=['GET'])
def get_messages():
    """Return sample messages"""
    return jsonify({"messages": sample_messages})

@app.route('/api/echo', methods=['POST'])
def echo():
    """Echo back the request data"""
    data = request.json
    return jsonify({
        "status": "success",
        "message": "Echoed back data",
        "data": data
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    """Simulate a chat response"""
    data = request.json
    prompt = data.get('message', '')
    chatbot = OpenAIChatbot()
    response = {
        "role": "assistant",
        "content": chatbot.generate_response(prompt)
    }
    return jsonify({"response": response})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
