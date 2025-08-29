#!/bin/bash

# AI Doctor Website Deployment Script
# This script helps you set up and deploy the AI Doctor website

echo "🏥 AI Doctor Website Deployment Script"
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm $(npm -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Check if config.env exists
if [ ! -f "config.env" ]; then
    echo "⚠️  config.env file not found. Creating template..."
    cat > config.env << EOF
# Gemini API Configuration
GEMINI_API_KEY=AIzaSyBSobhLKLsbZ4zbn8xt5OxWgmcRJsvDowU

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server Configuration
PORT=3000
NODE_ENV=development
EOF
    echo "📝 Please update config.env with your actual credentials"
    echo "🔑 Your Gemini API key is already configured"
    echo "🗄️  You need to add your Supabase credentials"
fi

# Check if Supabase credentials are configured
if grep -q "your_supabase_project_url" config.env; then
    echo "⚠️  Supabase credentials not configured. The app will work without database features."
    echo "📚 To enable database features, update config.env with your Supabase credentials"
    echo "🔗 Visit: https://supabase.com/ to create a project"
fi

# Create logs directory
mkdir -p logs

echo ""
echo "🚀 Starting AI Doctor Website..."
echo "📱 Open http://localhost:3000 in your browser"
echo "🛑 Press Ctrl+C to stop the server"
echo ""

# Start the application
npm start
