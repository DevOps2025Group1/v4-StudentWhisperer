#!/bin/bash

# Generate env-config.js with runtime environment variables
echo "window.ENV = {" > /usr/share/nginx/html/env-config.js
echo "  VITE_API_URL: \"$VITE_API_URL\"," >> /usr/share/nginx/html/env-config.js
echo "  VITE_FRONTEND_URL: \"$VITE_FRONTEND_URL\"," >> /usr/share/nginx/html/env-config.js
echo "}" >> /usr/share/nginx/html/env-config.js

# Start nginx
exec nginx -g "daemon off;"
