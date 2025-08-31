import path from "path";
import fs from "fs";
import Database from "better-sqlite3";

// Set test environment before importing anything else
process.env.NODE_ENV = "test";
process.env.DATABASE_TYPE = "sqlite";

let testDb: Database.Database;

export const initializeTestDatabase = () => {
  // Create data directory if it doesn't exist
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Use a separate test database
  const dbPath = path.join(dataDir, "test.db");

  // Remove existing test database to start fresh
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  // Create and initialize database
  testDb = new Database(dbPath);
  testDb.pragma("foreign_keys = ON");

  // Create tables
  testDb.exec(`
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

  testDb.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      username TEXT NOT NULL,
      numbers TEXT DEFAULT '[]',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
    )
  `);

  return testDb;
};

export const getTestDatabase = () => testDb;

export const clearDatabase = () => {
  if (testDb) {
    testDb.exec("DELETE FROM players");
    testDb.exec("DELETE FROM rooms");
  }
};

export const closeDatabase = () => {
  if (testDb) {
    testDb.close();
  }
};
