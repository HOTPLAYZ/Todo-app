#!/usr/bin/env sh
cd "$(dirname "$0")"
echo "Starting Taskwell at http://localhost:8080"
echo "Press Ctrl+C to stop the server."
python3 -m http.server 8080
