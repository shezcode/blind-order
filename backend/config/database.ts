import Database from "better-sqlite3";
import mysql from "mysql2/promise";
import path from "path";
import fs from "fs";
import { config } from "./index";
import { logger } from "../src/utils/logger";

class DatabaseManager {
  private sqlite: Database.Database | null = null;
  private pool: mysql.Pool | null = null;

  public async initialize(): Promise<void> {
    const dbConfig = config.getDatabase();

    if (dbConfig.type === "sqlite") {
      this.initializeSQLite();
    } else {
      await this.initializeMariaDB();
    }
  }

  private initializeSQLite(): void {
    const dataDir = path.join(process.cwd(), "data");

    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Use test.db for test environment, blindorder.db for others
    const dbFileName =
      process.env.NODE_ENV === "test" ? "test.db" : "blindorder.db";
    const dbPath = path.join(dataDir, dbFileName);

    // Only log in non-test environments
    if (process.env.NODE_ENV !== "test") {
      logger.info(`Initializing SQLite database at ${dbPath}`);
    }

    this.sqlite = new Database(dbPath);
    this.sqlite.pragma("foreign_keys = ON");

    // Create tables
    this.createSQLiteTables();
  }

  private createSQLiteTables(): void {
    if (!this.sqlite) return;

    this.sqlite.exec(`
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

    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        username TEXT NOT NULL,
        numbers TEXT DEFAULT '[]',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
      )
    `);
  }

  private async initializeMariaDB(): Promise<void> {
    const dbConfig = config.getDatabase();

    this.pool = mysql.createPool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // Test connection
    try {
      const connection = await this.pool.getConnection();
      if (process.env.NODE_ENV !== "test") {
        logger.info("MariaDB connection established");
      }
      connection.release();

      // Create tables
      await this.createMariaDBTables();
    } catch (error) {
      logger.error("Failed to connect to MariaDB:", error);
      throw error;
    }
  }

  private async createMariaDBTables(): Promise<void> {
    if (!this.pool) return;

    await this.pool.execute(`
      CREATE TABLE IF NOT EXISTS rooms (
        id VARCHAR(10) PRIMARY KEY,
        max_lives INT NOT NULL DEFAULT 3,
        numbers_per_player INT NOT NULL DEFAULT 6,
        lives INT NOT NULL DEFAULT 3,
        state ENUM('lobby', 'playing', 'game-over', 'victory') NOT NULL DEFAULT 'lobby',
        host_id VARCHAR(50),
        timeline JSON DEFAULT '[]',
        game_events JSON DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await this.pool.execute(`
      CREATE TABLE IF NOT EXISTS players (
        id VARCHAR(50) PRIMARY KEY,
        room_id VARCHAR(10) NOT NULL,
        username VARCHAR(50) NOT NULL,
        numbers JSON DEFAULT '[]',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
        INDEX idx_room_id (room_id)
      )
    `);
  }

  public getSQLite(): Database.Database | null {
    return this.sqlite;
  }

  public getPool(): mysql.Pool | null {
    return this.pool;
  }

  public async close(): Promise<void> {
    if (this.sqlite) {
      this.sqlite.close();
    }
    if (this.pool) {
      await this.pool.end();
    }
  }
}

export const database = new DatabaseManager();
