#!/bin/bash

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "=============================="
    echo "Terminating all services..."
    echo "=============================="
    # Kill all background jobs started by this script
    kill $(jobs -p) 2>/dev/null
    exit 0
}

# Set trap to catch termination signals (SIGINT/Ctrl+C, SIGTERM, EXIT)
trap cleanup SIGINT SIGTERM EXIT

# Start Backend
echo "=============================="
echo "Starting Backend (FastAPI)..."
echo "=============================="
cd backend || exit 1
# Ensure virtual environment is activated if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
cd ..

# Start Frontend
echo "=============================="
echo "Starting Frontend (Expo)..."
echo "=============================="
cd frontend || exit 1
# Load NVM to ensure npm/npx are available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
# Tell NVM to use the default or current node version
nvm use default > /dev/null 2>&1 || nvm use node > /dev/null 2>&1

npx expo start &
cd ..

echo ""
echo "=============================="
echo "✅ Both services are running!"
echo "🛑 Press Ctrl+C to stop both."
echo "=============================="

# Wait for background jobs to finish (this keeps the script running in the foreground)
wait
