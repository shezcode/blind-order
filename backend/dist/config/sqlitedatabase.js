"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.initializeDatabase = initializeDatabase;
exports.cleanupOldRooms = cleanupOldRooms;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Ensure data directory exists
const dataDir = path_1.default.join(process.cwd(), "data");
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path_1.default.join(dataDir, "blindorder.db");
exports.db = new better_sqlite3_1.default(dbPath);
// Enable foreign keys
exports.db.pragma("foreign_keys = ON");
// Initialize database schema
function initializeDatabase() {
    // Rooms table
    exports.db.exec(`
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
    // Players table
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      username TEXT NOT NULL,
      numbers TEXT DEFAULT '[]',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
    )
  `);
    // Create indexes for better performance
    exports.db.exec(`
    CREATE INDEX IF NOT EXISTS idx_players_room_id ON players (room_id);
  `);
    // Create trigger to update updated_at on rooms
    exports.db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_rooms_timestamp
    AFTER UPDATE ON rooms
    BEGIN
      UPDATE rooms SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);
    console.log("Database initialized successfully");
}
// Cleanup old rooms (older than 24 hours with no activity)
function cleanupOldRooms() {
    const stmt = exports.db.prepare(`
    DELETE FROM rooms 
    WHERE updated_at < datetime('now', '-24 hours')
  `);
    const result = stmt.run();
    if (result.changes > 0) {
        console.log(`Cleaned up ${result.changes} old rooms`);
    }
}
// Run cleanup every hour
setInterval(cleanupOldRooms, 60 * 60 * 1000);
