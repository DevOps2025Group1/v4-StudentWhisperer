from flask import Flask, jsonify, request
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

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
    user_message = data.get('message', '')

    # In a real app, this would call an actual chat service
    response = {
        "id": "response-" + str(len(sample_messages) + 1),
        "role": "assistant",
        "content": f"You said: '{user_message}'. This is a simulated response from the backend API."
    }

    return jsonify({"response": response})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
