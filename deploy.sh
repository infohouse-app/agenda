#!/bin/bash

# Deploy Script for Appointment System
echo "🚀 Starting deployment process..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from example..."
    cp .env.example .env
    print_warning "Please edit .env file with your configuration before continuing."
    read -p "Press Enter after editing .env file..."
fi

# Build and start services
print_status "Building Docker images..."
docker-compose build

print_status "Starting services..."
docker-compose up -d

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    print_status "Services started successfully!"
    echo ""
    echo "🌟 Your application is now running!"
    echo "📱 Access: http://localhost:5000"
    echo "📊 Database: PostgreSQL on port 5432"
    echo ""
    echo "📋 Useful commands:"
    echo "  View logs: docker-compose logs -f app"
    echo "  Stop: docker-compose down"
    echo "  Restart: docker-compose restart"
    echo ""
else
    print_error "Failed to start services. Check logs with: docker-compose logs"
    exit 1
fi

echo "🎉 Deployment completed!"