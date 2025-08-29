# BlindOrder - Game Room Management System

A comprehensive web application for managing game rooms and players, built with Vue.js frontend and Node.js/Express backend with SQLite database.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Usage Guide](#usage-guide)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

BlindOrder is a full-stack web application designed to manage game rooms and players in a cooperative number sequencing game. The system provides comprehensive CRUD operations for both rooms and players, with a modern Vue.js frontend and a robust Express.js backend.

### Key Functionality

- **Room Management**: Create, view, edit, and delete game rooms
- **Player Management**: Add, manage, and remove players across all rooms
- **Game Functionality**: Play the original BlindOrder cooperative game
- **Real-time Statistics**: Dashboard with live system metrics
- **Responsive Design**: Mobile-friendly interface

## ✨ Features

### Room Management

- 📊 **Dashboard View**: Overview of all rooms with statistics
- 🎮 **Game Settings**: Configurable lives and numbers per player
- 🔍 **Search & Filter**: Find rooms by ID and filter by status
- 📱 **Responsive Design**: Mobile-optimized interface
- 🔄 **Real-time Updates**: Live data synchronization

### Player Management

- 👥 **Cross-Room View**: Manage players across all rooms
- 👑 **Role Management**: Host assignment and player roles
- 📈 **Player Statistics**: Individual player metrics and history
- 🎯 **Status Tracking**: Monitor player activity and game state

### Game Functionality

- 🎲 **Cooperative Gameplay**: Original BlindOrder game mechanics
- 🔢 **Number Sequencing**: Team coordination challenge
- 💡 **Lives System**: Configurable difficulty levels
- 🏆 **Victory Conditions**: Complete sequence challenges

### Technical Features

- 🚀 **RESTful API**: Clean, documented API endpoints
- 💾 **SQLite Database**: Lightweight, reliable data storage
- 🔄 **WebSocket Support**: Real-time game communication
- 📦 **Docker Ready**: Containerized deployment options
- 🛡️ **Error Handling**: Comprehensive validation and error management

## 🛠 Technology Stack

### Frontend

- **Vue.js 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Vue Router** - Client-side routing
- **Pinia** - State management
- **Vite** - Build tool and development server

### Backend

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type-safe JavaScript
- **SQLite** - Embedded database
- **better-sqlite3** - SQLite driver
- **Socket.IO** - Real-time communication
- **CORS** - Cross-origin resource sharing

### Development Tools

- **Docker** - Containerization
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Git** - Version control

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **npm** (v8.0.0 or higher)
- **Git** (for version control)
- **Docker** (optional, for containerized deployment)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/shezcode/blindorder.git
cd blindorder
```

### 2. Install Dependencies

Install dependencies for both frontend and backend:

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install

# Return to root directory
cd ..
```

### 3. Database Setup

The SQLite database is automatically created when the backend starts for the first time. Sample data is seeded automatically.

## 🏃‍♂️ Running the Application

### Development Mode

#### Option 1: Using Concurrently (Recommended)

```bash
# Run both frontend and backend simultaneously
npm run dev
```

#### Option 2: Manual Start

```bash
# Terminal 1 - Start Backend (http://localhost:3001)
cd backend
npm run dev

# Terminal 2 - Start Frontend (http://localhost:5173)
cd frontend
npm run dev
```

### Production Mode

```bash
# Build the application
npm run build

# Start production servers
npm start
```

### Docker Deployment

```bash
# Development with Docker
./deploy.sh dev

# Production with Docker
./deploy.sh prod

# Stop services
./deploy.sh stop
```

## 📖 API Documentation

### Base URL

- **Development**: `http://localhost:3001`
- **Production**: `https://your-domain.com`

### Rooms API

| Method | Endpoint                 | Description      | Body Parameters                |
| ------ | ------------------------ | ---------------- | ------------------------------ |
| GET    | `/api/rooms`             | List all rooms   | -                              |
| GET    | `/api/rooms/:id`         | Get room details | -                              |
| POST   | `/api/rooms`             | Create new room  | `maxLives`, `numbersPerPlayer` |
| PUT    | `/api/rooms/:id`         | Update room      | `maxLives`, `numbersPerPlayer` |
| DELETE | `/api/rooms/:id`         | Delete room      | -                              |
| GET    | `/api/rooms/:id/players` | Get room players | -                              |
| POST   | `/api/rooms/:id/reset`   | Reset room state | -                              |

### Players API

| Method | Endpoint                 | Description           | Body Parameters      |
| ------ | ------------------------ | --------------------- | -------------------- |
| GET    | `/api/players`           | List all players      | -                    |
| GET    | `/api/players/:id`       | Get player details    | -                    |
| POST   | `/api/players`           | Add player to room    | `roomId`, `username` |
| PUT    | `/api/players/:id`       | Update player         | `username`           |
| DELETE | `/api/players/:id`       | Remove player         | -                    |
| GET    | `/api/players/:id/stats` | Get player statistics | -                    |

### Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "data": {...},
  "message": "Operation completed successfully",
  "total": 10
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error description",
  "details": "Additional error details"
}
```

## 📚 Usage Guide

### For Administrators

#### Managing Rooms

1. Navigate to `/rooms` to view all game rooms
2. Click "Create New Room" to add a room
3. Use search and filters to find specific rooms
4. Click "Edit" to modify room settings (only in lobby state)
5. Click "View" to see detailed room information
6. Click "Delete" to remove a room

#### Managing Players

1. Navigate to `/players` to view all players
2. Click "Add New Player" to add a player to a room
3. Use filters to view hosts, active players, etc.
4. Click "Edit" to modify player information
5. Click "View" to see player statistics
6. Click "Remove" to remove a player from their room

### For Players

#### Creating a Game

1. Go to `/create` or click "Create New Room" on the home page
2. Enter your name and configure game settings
3. Click "Create Room" to start
4. Share the room code with other players

#### Joining a Game

1. Get a room code from the host
2. Enter the room code and your username on the home page
3. Click "Join Room"
4. Wait for the host to start the game

#### Playing the Game

1. Once the game starts, you'll see your assigned numbers
2. Players must play numbers in ascending order
3. Coordinate with your team (no direct communication allowed!)
4. Complete all numbers to win, or lose lives for wrong moves

## 🔧 Development

### Backend Development

```bash
cd backend

# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint

# Format code
npm run format
```

### Database Management

The SQLite database is located at `backend/data/blindorder.db`. You can inspect it using any SQLite browser or CLI tool.

```bash
# Access SQLite CLI
sqlite3 backend/data/blindorder.db

# View tables
.tables

# View schema
.schema rooms
.schema players
```

### Adding New Features

1. Create a new branch: `git checkout -b feature/new-feature`
2. Make your changes
3. Test thoroughly
4. Update documentation
5. Create a pull request

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for code formatting
- Write meaningful commit messages

### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Update documentation
6. Submit a pull request

### Commit Message Format

```
feature: add new feature
fix: resolve bug issue
docs: update documentation
style: formatting changes
refactor: code restructuring
test: add or update tests
```

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Kill processes using the ports
npx kill-port 3001 5173

# Or use different ports
PORT=3002 npm run dev:backend
```

#### Database Lock Error

```bash
# Stop all processes and restart
./deploy.sh stop
rm backend/data/blindorder.db
npm run dev
```

#### Module Not Found

```bash
# Clear node_modules and reinstall
rm -rf node_modules frontend/node_modules backend/node_modules
npm run install:all
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/shezcode/blindorder/issues) page
2. Create a new issue with detailed information
3. Include error messages, screenshots, and steps to reproduce

## 🎉 Acknowledgments

- Built as part of a web development course assignment
- Inspired by cooperative game mechanics
- Thanks to all contributors and testers

---

**Happy Gaming!** 🎮

For more information, visit our [GitHub repository](https://github.com/shezcode/blindorder).
