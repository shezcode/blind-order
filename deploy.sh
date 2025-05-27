#!/bin/bash

# BlindOrder Docker Management Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
  if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
  fi
}

# Development deployment
dev_deploy() {
  print_status "Starting BlindOrder in development mode..."
  check_docker

  docker-compose down --remove-orphans
  docker-compose build
  docker-compose up -d

  print_status "Application started!"
  print_status "Frontend: http://localhost:8080"
  print_status "Backend API: http://localhost:3001"
  print_status ""
  print_status "To view logs: docker-compose logs -f"
  print_status "To stop: docker-compose down"
}

# Production deployment with reverse proxy
prod_deploy() {
  print_status "Starting BlindOrder in production mode..."
  check_docker

  # Check if SSL certificates exist
  if [ ! -f "./nginx/ssl/cert.pem" ] || [ ! -f "./nginx/ssl/key.pem" ]; then
    print_warning "SSL certificates not found. Creating self-signed certificates..."
    mkdir -p ./nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout ./nginx/ssl/key.pem \
      -out ./nginx/ssl/cert.pem \
      -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    print_status "Self-signed certificates created. Replace with real certificates for production."
  fi

  docker-compose --profile production down --remove-orphans
  docker-compose --profile production build
  docker-compose --profile production up -d

  print_status "Application started in production mode!"
  print_status "Application: http://localhost (or https://localhost with SSL)"
  print_status "Health check: http://localhost/health"
}

# Stop all services
stop_services() {
  print_status "Stopping BlindOrder services..."
  docker-compose --profile production down --remove-orphans
  docker-compose down --remove-orphans
  print_status "All services stopped."
}

# Show logs
show_logs() {
  echo "Available services: backend, frontend, nginx"
  if [ -z "$2" ]; then
    docker-compose logs -f
  else
    docker-compose logs -f "$2"
  fi
}

# Clean up everything
cleanup() {
  print_warning "This will remove all containers, images, and volumes. Are you sure? (y/N)"
  read -r response
  if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    print_status "Cleaning up..."
    docker-compose down --remove-orphans --volumes
    docker system prune -f --volumes
    docker volume prune -f
    print_status "Cleanup complete."
  else
    print_status "Cleanup cancelled."
  fi
}

# Show status
show_status() {
  print_status "BlindOrder Service Status:"
  docker-compose ps
  echo ""
  print_status "Docker System Info:"
  docker system df
}

# Update application
update_app() {
  print_status "Updating BlindOrder application..."
  git pull origin main
  docker-compose down
  docker-compose build --no-cache
  docker-compose up -d
  print_status "Application updated and restarted!"
}

# Backup database
backup_db() {
  timestamp=$(date +%Y%m%d_%H%M%S)
  backup_file="blindorder_backup_$timestamp.db"

  print_status "Creating database backup..."
  docker-compose exec backend cp /app/data/blindorder.db /app/data/$backup_file
  docker cp blindorder-backend:/app/data/$backup_file ./$backup_file

  print_status "Database backup created: $backup_file"
}

# Show help
show_help() {
  echo "BlindOrder Docker Management Script"
  echo ""
  echo "Usage: $0 [COMMAND]"
  echo ""
  echo "Commands:"
  echo "  dev       Start in development mode (default)"
  echo "  prod      Start in production mode with reverse proxy"
  echo "  stop      Stop all services"
  echo "  logs      Show logs for all services"
  echo "  logs [service]  Show logs for specific service"
  echo "  status    Show service status"
  echo "  update    Update and restart application"
  echo "  backup    Backup the database"
  echo "  cleanup   Remove all containers, images, and volumes"
  echo "  help      Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0 dev          # Start development environment"
  echo "  $0 prod         # Start production environment"
  echo "  $0 logs backend # Show backend logs"
  echo "  $0 stop         # Stop all services"
}

# Main script logic
case "${1:-dev}" in
"dev")
  dev_deploy
  ;;
"prod")
  prod_deploy
  ;;
"stop")
  stop_services
  ;;
"logs")
  show_logs "$@"
  ;;
"status")
  show_status
  ;;
"update")
  update_app
  ;;
"backup")
  backup_db
  ;;
"cleanup")
  cleanup
  ;;
"help" | "-h" | "--help")
  show_help
  ;;
*)
  print_error "Unknown command: $1"
  show_help
  exit 1
  ;;
esac
