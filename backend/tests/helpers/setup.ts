import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { Room, Player } from "../../src/lib/types";

// Test database setup
export const setupTestDatabase = () => {
  const testDbPath = path.join(process.cwd(), "data", "test.db");

  // Ensure data directory exists
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Remove existing test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  const db = new Database(testDbPath);

  // Enable foreign keys
  db.pragma("foreign_keys = ON");

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      max_lives INTEGER NOT NULL DEFAULT 3,
      numbers_per_player INTEGER NOT NULL DEFAULT 6,
      lives INTEGER NOT NULL DEFAULT 3,
      state TEXT NOT NULL DEFAULT 'lobby' CHECK (state IN ('lobby', 'playing', 'game-over', 'victory')),
      host_id TEXT,
      timeline TEXT DEFAULT '[]',
      game_events TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      username TEXT NOT NULL,
      numbers TEXT DEFAULT '[]',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
    )
  `);

  return db;
};

export const cleanupTestDatabase = () => {
  const testDbPath = path.join(process.cwd(), "data", "test.db");
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
};

// Mock data generators with proper typing
export const mockRoom = (overrides: Partial<Room> = {}): Room =>
  ({
    id: "TEST123",
    maxLives: 3,
    numbersPerPlayer: 6,
    lives: 3,
    state: "lobby" as "lobby" | "playing" | "game-over" | "victory",
    hostId: "",
    timeline: [],
    gameEvents: [],
    players: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Room);

export const mockPlayer = (overrides: Partial<Player> = {}): Player =>
  ({
    id: "player-123",
    roomId: "TEST123",
    username: "TestPlayer",
    numbers: [],
    joinedAt: new Date().toISOString(),
    ...overrides,
  } as Player);

// Express app setup for integration tests
export const setupTestApp = () => {
  const express = require("express");
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Add your routes here
  const roomRoutes = require("../../src/routes/rooms").default;
  const playerRoutes = require("../../src/routes/players").default;

  app.use("/api/rooms", roomRoutes);
  app.use("/api/players", playerRoutes);

  return app;
};

// Test utilities
export const generateRoomId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Environment setup
process.env.NODE_ENV = "test";
process.env.DATABASE_TYPE = "sqlite";
process.env.PORT = "3002";

// Override the database path for tests
const testDbPath = path.join(process.cwd(), "data", "test.db");
process.env.SQLITE_DB_PATH = testDbPath;
