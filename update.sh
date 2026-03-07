#!/bin/bash

# Configuration
# Change these if your project paths are different
PROJECT_ROOT="/var/www/crova"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
PM2_APP_NAME="crova-backend"

# Function to handle errors
error_exit() {
    echo "❌ Error: $1"
    # Attempt to restore .env backups if they exist before exiting
    [[ -f .env_backend_backup ]] && cp .env_backend_backup "$BACKEND_DIR/.env"
    [[ -f .env_frontend_backup ]] && cp .env_frontend_backup "$FRONTEND_DIR/.env"
    exit 1
}

echo "🚀 Starting Crova Robust Deployment..."

# 1. Backup existing VPS environment variables (Safety First)
echo "🔒 Backing up current production .env files..."
# We backup to the home directory or project root root with a clear name
[[ -f "$BACKEND_DIR/.env" ]] && cp "$BACKEND_DIR/.env" "$PROJECT_ROOT/PROD_BACKEND_ENV"
[[ -f "$FRONTEND_DIR/.env" ]] && cp "$FRONTEND_DIR/.env" "$PROJECT_ROOT/PROD_FRONTEND_ENV"

# 2. Sync code from GitHub (Separate Repositories)
echo "📥 Syncing Backend from GitHub..."
cd "$BACKEND_DIR" || error_exit "Backend directory not found"
git fetch origin main
git reset --hard origin/main || error_exit "Backend git sync failed"

echo "📥 Syncing Frontend from GitHub..."
cd "$FRONTEND_DIR" || error_exit "Frontend directory not found"
git fetch origin main
git reset --hard origin/main || error_exit "Frontend git sync failed"

# Return to root for relative path safety in subsequent steps
cd "$PROJECT_ROOT"

# 3. Restore VPS Environment Variables (Overwriting GitHub defaults)
echo "🛡️ Restoring production environment variables..."
[[ -f "$PROJECT_ROOT/PROD_BACKEND_ENV" ]] && cp "$PROJECT_ROOT/PROD_BACKEND_ENV" "$BACKEND_DIR/.env"
[[ -f "$PROJECT_ROOT/PROD_FRONTEND_ENV" ]] && cp "$PROJECT_ROOT/PROD_FRONTEND_ENV" "$FRONTEND_DIR/.env"

# 4. Update Backend
echo "📦 Updating Backend..."
cd "$BACKEND_DIR" || error_exit "Backend directory not found"

npm install || {
    echo "⚠️ npm install failed. Attempting clean install..."
    rm -rf node_modules package-lock.json
    npm install
} || error_exit "Backend npm install failed"

npx prisma generate || echo "⚠️ Prisma generate failed"

# Restart Backend with PM2
echo "🔄 Fresh restart for Backend..."
pm2 restart $PM2_APP_NAME --update-env || pm2 start server.js --name $PM2_APP_NAME || error_exit "PM2 restart failed"

# 5. Update Frontend
echo "🎨 Updating Frontend..."
cd "$FRONTEND_DIR" || error_exit "Frontend directory not found"

echo "🧹 Deleting existing build (dist folder)..."
rm -rf dist

echo "📦 Installing Frontend dependencies..."
npm install || {
    echo "⚠️ npm install failed. Force cleaning node_modules..."
    rm -rf node_modules package-lock.json
    npm install
} || error_exit "Frontend npm install failed"

echo "🛠️ Creating fresh production build..."
# Build will use the restored .env (subdomain URLs)
npm run build || error_exit "Frontend build failed"

echo "🎉 Update successful! Your site is now running with preserved production URLs and a fresh build."
