import mysql from "mysql2/promise";
import { config } from "./index";
import { logger } from "../src/utils/logger";
import { Room } from "../src/lib/types";

export class DatabaseManager {
  private connection: mysql.Connection | null = null;
  private pool: mysql.Pool | null = null;

  async initialize(): Promise<void> {
    try {
      const dbConfig = config.getDatabase();

      if (dbConfig.type === "mariadb") {
        await this.initializeMariaDB();
      } else {
        throw new Error(`Unsupported database type: ${dbConfig.type}`);
      }

      await this.createTables();
      await this.seedDatabase();

      logger.info("Database initialized successfully");
    } catch (error) {
      logger.error("Failed to init database: ", error);
      throw error;
    }
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

    const connection = await this.pool.getConnection();
    await connection.ping();
    connection.release();
  }

  private async createTables(): Promise<void> {
    if (!this.pool) throw new Error("Database not initialized");

    const createRoomsTable = `
      CREATE TABLE IF NOT EXISTS rooms (
        id VARCHAR(255) PRIMARY KEY,
        max_lives INT NOT NULL DEFAULT 3,
        numbers_per_player INT NOT NULL DEFAULT 6,
        lives INT NOT NULL DEFAULT 3,
        state ENUM('lobby', 'playing', 'game-over', 'victory') NOT NULL DEFAULT 'lobby',
        host_id VARCHAR(255),
        timeline JSON DEFAULT '[]',
        game_events JSON DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_state (state),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    const createPlayersTable = `
      CREATE TABLE IF NOT EXISTS players (
        id VARCHAR(255) PRIMARY KEY,
        room_id VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        numbers JSON DEFAULT '[]',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
        INDEX idx_room_id (room_id),
        INDEX idx_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    try {
      await this.pool.execute(createRoomsTable);
      await this.pool.execute(createPlayersTable);
      logger.info("Database tables created successfully");
    } catch (error) {
      logger.error("Failed to create tables", error);
      throw error;
    }
  }

  private async seedDatabase(): Promise<void> {
    if (!this.pool) return;

    try {
      const [rooms] = await this.pool.execute(
        "SELECT COUNT(*) as count FROM rooms"
      );
      const roomCount = (rooms as any[])[0].count;

      if (roomCount > 0) {
        logger.info("Database already contains data, skipping seed");
        return;
      }

      const sampleRooms: Room[] = [
        {
          id: "DEMO01",
          players: [],
          maxLives: 3,
          numbersPerPlayer: 6,
          lives: 3,
          state: "lobby",
          hostId: "",
          timeline: [],
          gameEvents: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "DEMO02",
          players: [],
          maxLives: 5,
          numbersPerPlayer: 8,
          lives: 5,
          state: "lobby",
          hostId: "",
          timeline: [],
          gameEvents: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      const insertRoomQuery = `
        INSERT INTO rooms (id, max_lives, numbers_per_player, lives, state, host_id, timeline, game_events)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      for (const room of sampleRooms) {
        await this.pool.execute(insertRoomQuery, [
          room.id,
          room.maxLives,
          room.numbersPerPlayer,
          room.lives,
          room.state,
          room.hostId,
          room.timeline,
          room.gameEvents,
        ]);
      }

      logger.info(`Seeded ${sampleRooms.length} sample rooms`);
    } catch (error) {
      logger.error("Failed to seed db", error);
    }
  }

  public getPool(): mysql.Pool {
    if (!this.pool) {
      throw new Error("Db not initialized");
    }
    return this.pool;
  }

  public async query(sql: string, params?: any[]): Promise<any> {
    if (!this.pool) throw new Error("Db not initialized");

    try {
      const [results] = await this.pool.execute(sql, params);
      return results;
    } catch (error) {
      logger.error("Db query failed", { sql, params, error });
      throw error;
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info("Db connection closed");
    }
  }
}

export const database = new DatabaseManager();
