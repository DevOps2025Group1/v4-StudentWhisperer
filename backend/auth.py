from flask import request, jsonify, current_app
import jwt
import requests
import os
import logging
from functools import wraps

# Configuration - In production, use environment variables
TENANT_ID = os.environ.get("AZURE_TENANT_ID", "YOUR_TENANT_ID")
CLIENT_ID = os.environ.get("AZURE_CLIENT_ID", "YOUR_API_CLIENT_ID")
AUTHORITY_URL = f"https://login.microsoftonline.com/{TENANT_ID}"
JWKS_URL = f"{AUTHORITY_URL}/discovery/v2.0/keys"


def verify_token():
    """
    Verify the JWT token from the Authorization header
    Returns the decoded token payload if valid, or an error response tuple
    """
    auth_header = request.headers.get("Authorization", None)
    if not auth_header:
        return jsonify({"error": "Authorization header missing"}), 401

    try:
        token = auth_header.split(" ")[1]
    except IndexError:
        return jsonify({"error": "Invalid Authorization header format"}), 401

    try:
        # Fetch Microsoft public keys
        jwks = requests.get(JWKS_URL).json()
        public_keys = {key["kid"]: key for key in jwks["keys"]}

        # Get the token header to find the key ID
        header = jwt.get_unverified_header(token)
        if header.get("kid") not in public_keys:
            return jsonify({"error": "Key ID not found"}), 401

        # Decode JWT
        decoded_token = jwt.decode(
            token,
            public_keys[header["kid"]],
            algorithms=["RS256"],
            audience=CLIENT_ID,
            options={"verify_exp": True},
        )

        return decoded_token
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token has expired"}), 401
    except jwt.InvalidTokenError as e:
        return jsonify({"error": f"Invalid token: {str(e)}"}), 401
    except Exception as e:
        return jsonify({"error": f"Token verification failed: {str(e)}"}), 401


def require_auth(f):
    """
    Decorator for routes that require authentication
    """

    @wraps(f)
    def decorated(*args, **kwargs):
        user = verify_token()
        if isinstance(user, tuple):  # Error response
            return user
        # Add user info to request for the route to use
        request.user = user
        return f(*args, **kwargs)

    return decorated


def token_required(f):
    """
    Decorator for routes that require JWT authentication (our own JWT, not Azure AD)
    """

    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # Get token from Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            logging.warning("Authentication failed: No Authorization header")
            return jsonify({"error": "Authorization header missing"}), 401

        try:
            # Check for Bearer token
            if not auth_header.startswith("Bearer "):
                logging.warning("Authentication failed: Not a bearer token")
                return jsonify({"error": "Invalid authorization header format"}), 401

            token = auth_header.split(" ")[1]
        except IndexError:
            logging.warning("Authentication failed: Couldn't extract token")
            return jsonify({"error": "Invalid authorization header format"}), 401

        if not token:
            logging.warning("Authentication failed: Empty token")
            return jsonify({"error": "Token is empty"}), 401

        try:
            # Verify the token
            data = jwt.decode(
                token, current_app.config["SECRET_KEY"], algorithms=["HS256"]
            )

            # Add user data to the request
            request.current_user = {
                "email": data.get("email", "unknown"),
                "name": data.get("name", "unknown"),
            }

            logging.info(
                f"Authentication successful for user: {request.current_user['email']}"
            )

        except jwt.ExpiredSignatureError:
            logging.warning("Authentication failed: Token expired")
            return jsonify({"error": "Token has expired"}), 401

        except jwt.InvalidTokenError as e:
            logging.warning(f"Authentication failed: Invalid token - {str(e)}")
            return jsonify({"error": "Token is invalid"}), 401

        except Exception as e:
            logging.error(f"Authentication failed: Unexpected error - {str(e)}")
            return jsonify({"error": "Authentication failed"}), 401

        return f(*args, **kwargs)

    return decorated
