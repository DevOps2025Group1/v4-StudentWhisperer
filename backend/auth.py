from flask import request, jsonify, current_app
import jwt
import requests
import os
import logging
from functools import wraps
import json
from datetime import datetime, timedelta
from jwt.algorithms import RSAAlgorithm

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# Configuration - In production, use environment variables
TENANT_ID = os.environ.get("AZURE_TENANT_ID", "common")
CLIENT_ID = os.environ.get("AZURE_CLIENT_ID", "a92b7d10-cce3-48d9-b794-1210c1a4e9bb")
AUTHORITY_URL = f"https://login.microsoftonline.com/{TENANT_ID}"
JWKS_URL = f"{AUTHORITY_URL}/discovery/v2.0/keys"
ISSUER = f"https://login.microsoftonline.com/{TENANT_ID}/v2.0"

# Cache for JWKS keys
jwks_cache = {"keys": None, "last_updated": None}

# Cache for validated tokens to prevent excessive validation
token_cache = {}


def get_jwks():
    """
    Get JWKS keys from Microsoft, with caching
    """
    global jwks_cache

    # If cache is older than 24 hours or doesn't exist, refresh it
    if (
        not jwks_cache["last_updated"]
        or (datetime.now() - jwks_cache["last_updated"]).total_seconds() > 86400
    ):
        logging.info("Fetching new JWKS keys from Microsoft")
        try:
            response = requests.get(JWKS_URL)
            response.raise_for_status()  # Raises an HTTPError for bad responses
            jwks_cache["keys"] = response.json()["keys"]
            jwks_cache["last_updated"] = datetime.now()
        except Exception as e:
            logging.error(f"Error fetching JWKS keys: {e}")
            if not jwks_cache["keys"]:  # Only raise if we don't have any cached keys
                raise

    return jwks_cache["keys"]


def verify_azure_token(token=None):
    """
    Verify an Azure AD token
    """
    if not token:
        auth_header = request.headers.get("Authorization", None)
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authorization header missing or invalid"}), 401
        token = auth_header.split(" ")[1]

    # Check token cache first
    cached_result = token_cache.get(token)
    if cached_result:
        if cached_result["exp"] > datetime.utcnow():
            return cached_result["user_info"]

    try:
        # Get token header to extract kid
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")

        if not kid:
            logging.warning("No kid found in token header")
            return jsonify({"error": "Invalid token format: no kid"}), 401

        # Get the signing key
        keys = get_jwks()
        signing_key = None
        for key in keys:
            if key["kid"] == kid:
                signing_key = RSAAlgorithm.from_jwk(json.dumps(key))
                break

        if not signing_key:
            logging.warning(f"No matching key found for kid: {kid}")
            return jsonify({"error": "No matching signing key found"}), 401

        # Verify the token
        try:
            decoded = jwt.decode(
                token,
                key=signing_key,
                algorithms=["RS256"],
                audience=CLIENT_ID,
                verify=True,
            )
        except Exception as e:
            decoded = jwt.decode(
                token,
                key=signing_key,
                algorithms=["RS256"],
                options={"verify_aud": False},
            )

        user_info = {
            "name": decoded.get("name", "Unknown User"),
            "email": decoded.get(
                "preferred_username", decoded.get("email", "unknown@example.com")
            ),
            "sub": decoded.get("sub", "Unknown"),
            "auth_source": "azure_ad",
        }

        # Cache the validated token
        token_cache[token] = {
            "exp": datetime.utcnow() + timedelta(minutes=5),  # Cache for 5 minutes
            "user_info": user_info,
        }

        return user_info

    except jwt.ExpiredSignatureError:
        logging.warning("Token expired")
        return jsonify({"error": "Token expired"}), 401
    except jwt.InvalidTokenError as e:
        logging.warning(f"Invalid token: {str(e)}")
        return jsonify({"error": f"Invalid token: {str(e)}"}), 401
    except Exception as e:
        logging.error(f"Token verification error: {str(e)}")
        return jsonify({"error": "Token verification failed"}), 401


def require_azure_auth(f):
    """
    Decorator for routes that require Azure AD authentication
    """

    @wraps(f)
    def decorated(*args, **kwargs):
        user = verify_azure_token()
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
            # Check if token is an Azure token (they start with "ey" typically)
            if token.startswith("ey"):
                try:
                    # Try to validate as an Azure token first
                    azure_user = verify_azure_token(token)
                    if not isinstance(azure_user, tuple):
                        # If successful, set the user info
                        request.current_user = {
                            "email": azure_user.get("email", "unknown"),
                            "name": azure_user.get("name", "Azure User"),
                            "auth_source": "azure_ad",
                        }
                        return f(*args, **kwargs)
                except Exception as e:
                    logging.warning(
                        f"Azure token validation failed, trying app token: {e}"
                    )

            # Verify our own token format
            data = jwt.decode(
                token, current_app.config["SECRET_KEY"], algorithms=["HS256"]
            )

            # Add user data to the request
            request.current_user = {
                "email": data.get("email", "unknown"),
                "name": data.get("name", "unknown"),
                "auth_source": "internal",
            }

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


def exchange_azure_token(azure_token=None):
    """
    Exchange an Azure AD token for an application token
    """
    try:
        # If no token is provided, get it from request headers
        if not azure_token:
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return (
                    jsonify({"error": "Authorization header missing or invalid"}),
                    401,
                )
            azure_token = auth_header.split(" ")[1]

        # Verify the Azure token
        user_info = verify_azure_token(azure_token)

        if isinstance(user_info, tuple):  # Error response
            return user_info

        # Extract user information
        user_email = user_info.get("email", "unknown@example.com")
        user_name = user_info.get("name", "Azure User")

        # Generate our application token
        token_expiry = datetime.utcnow() + timedelta(hours=24)
        app_token = jwt.encode(
            {
                "email": user_email,
                "name": user_name,
                "auth_source": "azure_ad",
                "exp": token_expiry,
            },
            current_app.config["SECRET_KEY"],
            algorithm="HS256",
        )

        return {
            "token": app_token,
            "user": {"email": user_email, "name": user_name, "auth_source": "azure_ad"},
        }

    except Exception as e:
        logging.error(f"Token exchange error: {str(e)}")
        return jsonify({"error": f"Failed to exchange token: {str(e)}"}), 401
