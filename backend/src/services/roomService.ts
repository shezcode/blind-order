import {
  IRoomService,
  Room,
  CreateRoomData,
  UpdateRoomData,
  Player,
} from "../lib/types";
import { config } from "../config";
import { logger } from "../utils/logger";
import Database from "better-sqlite3";
import mysql from "mysql2/promise";
import path from "path";

export class RoomService implements IRoomService {
  private sqlite: Database.Database | null = null;
  private pool: mysql.Pool | null = null;

  constructor() {
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    const dbConfig = config.getDatabase();

    if (dbConfig.type === "sqlite") {
      this.initializeSQLite();
    }
    // MariaDB will be initialized when needed
  }

  private initializeSQLite(): void {
    const dataDir = path.join(process.cwd(), "data");
    const dbPath = path.join(dataDir, "blindorder.db");
    this.sqlite = new Database(dbPath);
    this.sqlite.pragma("foreign_keys = ON");
  }

  private async getMariaDBPool(): Promise<mysql.Pool> {
    if (!this.pool) {
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
    }
    return this.pool;
  }

  public generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  public async createRoom(data: CreateRoomData): Promise<Room> {
    const dbConfig = config.getDatabase();
    const roomId = this.generateRoomId();
    const now = new Date().toISOString();

    const roomData = {
      id: roomId,
      maxLives: data.maxLives,
      numbersPerPlayer: data.numbersPerPlayer,
      lives: data.maxLives,
      state: "lobby" as const,
      hostId: data.hostId || "",
      timeline: [],
      gameEvents: [],
      createdAt: now,
      updatedAt: now,
    };

    try {
      if (dbConfig.type === "sqlite") {
        return await this.createRoomSQLite(roomData);
      } else {
        return await this.createRoomMariaDB(roomData);
      }
    } catch (error) {
      logger.error("Error creating room:", error);
      throw new Error("Failed to create room");
    }
  }

  private async createRoomSQLite(roomData: Room): Promise<Room> {
    if (!this.sqlite) throw new Error("SQLite not initialized");

    const stmt = this.sqlite.prepare(`
      INSERT INTO rooms (id, max_lives, numbers_per_player, lives, state, host_id, timeline, game_events)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      roomData.id,
      roomData.maxLives,
      roomData.numbersPerPlayer,
      roomData.lives,
      roomData.state,
      roomData.hostId,
      JSON.stringify(roomData.timeline),
      JSON.stringify(roomData.gameEvents)
    );

    return roomData;
  }

  private async createRoomMariaDB(roomData: Room): Promise<Room> {
    const pool = await this.getMariaDBPool();

    const [result] = await pool.execute(
      `
      INSERT INTO rooms (id, max_lives, numbers_per_player, lives, state, host_id, timeline, game_events)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        roomData.id,
        roomData.maxLives,
        roomData.numbersPerPlayer,
        roomData.lives,
        roomData.state,
        roomData.hostId,
        JSON.stringify(roomData.timeline),
        JSON.stringify(roomData.gameEvents),
      ]
    );

    return roomData;
  }

  public async getRoomById(id: string): Promise<Room | null> {
    const dbConfig = config.getDatabase();

    try {
      if (dbConfig.type === "sqlite") {
        return await this.getRoomByIdSQLite(id);
      } else {
        return await this.getRoomByIdMariaDB(id);
      }
    } catch (error) {
      logger.error("Error getting room:", error);
      return null;
    }
  }

  private async getRoomByIdSQLite(id: string): Promise<Room | null> {
    if (!this.sqlite) throw new Error("SQLite not initialized");

    const stmt = this.sqlite.prepare("SELECT * FROM rooms WHERE id = ?");
    const row = stmt.get(id) as any;

    if (!row) return null;

    return this.mapSQLiteRowToRoom(row);
  }

  private async getRoomByIdMariaDB(id: string): Promise<Room | null> {
    const pool = await this.getMariaDBPool();

    const [rows] = await pool.execute("SELECT * FROM rooms WHERE id = ?", [id]);
    const roomRows = rows as any[];

    if (roomRows.length === 0) return null;

    return this.mapMariaDBRowToRoom(roomRows[0]);
  }

  public async updateRoom(
    id: string,
    data: UpdateRoomData
  ): Promise<Room | null> {
    const dbConfig = config.getDatabase();

    try {
      if (dbConfig.type === "sqlite") {
        return await this.updateRoomSQLite(id, data);
      } else {
        return await this.updateRoomMariaDB(id, data);
      }
    } catch (error) {
      logger.error("Error updating room:", error);
      throw new Error("Failed to update room");
    }
  }

  private async updateRoomSQLite(
    id: string,
    data: UpdateRoomData
  ): Promise<Room | null> {
    if (!this.sqlite) throw new Error("SQLite not initialized");

    const existingRoom = await this.getRoomByIdSQLite(id);
    if (!existingRoom) return null;

    const updatedData = {
      maxLives: data.maxLives ?? existingRoom.maxLives,
      numbersPerPlayer: data.numbersPerPlayer ?? existingRoom.numbersPerPlayer,
      lives: data.lives ?? existingRoom.lives,
      state: data.state ?? existingRoom.state,
      hostId: data.hostId ?? existingRoom.hostId,
      timeline: data.timeline ?? existingRoom.timeline,
      gameEvents: data.gameEvents ?? existingRoom.gameEvents,
    };

    const stmt = this.sqlite.prepare(`
      UPDATE rooms 
      SET max_lives = ?, numbers_per_player = ?, lives = ?, state = ?, 
          host_id = ?, timeline = ?, game_events = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      updatedData.maxLives,
      updatedData.numbersPerPlayer,
      updatedData.lives,
      updatedData.state,
      updatedData.hostId,
      JSON.stringify(updatedData.timeline),
      JSON.stringify(updatedData.gameEvents),
      id
    );

    return await this.getRoomByIdSQLite(id);
  }

  private async updateRoomMariaDB(
    id: string,
    data: UpdateRoomData
  ): Promise<Room | null> {
    const pool = await this.getMariaDBPool();

    const existingRoom = await this.getRoomByIdMariaDB(id);
    if (!existingRoom) return null;

    const updatedData = {
      maxLives: data.maxLives ?? existingRoom.maxLives,
      numbersPerPlayer: data.numbersPerPlayer ?? existingRoom.numbersPerPlayer,
      lives: data.lives ?? existingRoom.lives,
      state: data.state ?? existingRoom.state,
      hostId: data.hostId ?? existingRoom.hostId,
      timeline: data.timeline ?? existingRoom.timeline,
      gameEvents: data.gameEvents ?? existingRoom.gameEvents,
    };

    await pool.execute(
      `
      UPDATE rooms 
      SET max_lives = ?, numbers_per_player = ?, lives = ?, state = ?, 
          host_id = ?, timeline = ?, game_events = ?
      WHERE id = ?
    `,
      [
        updatedData.maxLives,
        updatedData.numbersPerPlayer,
        updatedData.lives,
        updatedData.state,
        updatedData.hostId,
        JSON.stringify(updatedData.timeline),
        JSON.stringify(updatedData.gameEvents),
        id,
      ]
    );

    return await this.getRoomByIdMariaDB(id);
  }

  public async deleteRoom(id: string): Promise<boolean> {
    const dbConfig = config.getDatabase();

    try {
      if (dbConfig.type === "sqlite") {
        return await this.deleteRoomSQLite(id);
      } else {
        return await this.deleteRoomMariaDB(id);
      }
    } catch (error) {
      logger.error("Error deleting room:", error);
      throw new Error("Failed to delete room");
    }
  }

  private async deleteRoomSQLite(id: string): Promise<boolean> {
    if (!this.sqlite) throw new Error("SQLite not initialized");

    const stmt = this.sqlite.prepare("DELETE FROM rooms WHERE id = ?");
    const result = stmt.run(id);

    return result.changes > 0;
  }

  private async deleteRoomMariaDB(id: string): Promise<boolean> {
    const pool = await this.getMariaDBPool();

    const [result] = await pool.execute("DELETE FROM rooms WHERE id = ?", [id]);
    const deleteResult = result as any;

    return deleteResult.affectedRows > 0;
  }

  public async getAllRooms(): Promise<Room[]> {
    const dbConfig = config.getDatabase();

    try {
      if (dbConfig.type === "sqlite") {
        return await this.getAllRoomsSQLite();
      } else {
        return await this.getAllRoomsMariaDB();
      }
    } catch (error) {
      logger.error("Error getting all rooms:", error);
      return [];
    }
  }

  private async getAllRoomsSQLite(): Promise<Room[]> {
    if (!this.sqlite) throw new Error("SQLite not initialized");

    const stmt = this.sqlite.prepare(
      "SELECT * FROM rooms ORDER BY created_at DESC"
    );
    const rows = stmt.all() as any[];

    return rows.map((row) => this.mapSQLiteRowToRoom(row));
  }

  private async getAllRoomsMariaDB(): Promise<Room[]> {
    const pool = await this.getMariaDBPool();

    const [rows] = await pool.execute(
      "SELECT * FROM rooms ORDER BY created_at DESC"
    );
    const roomRows = rows as any[];

    return roomRows.map((row) => this.mapMariaDBRowToRoom(row));
  }

  public async getRoomPlayers(roomId: string): Promise<Player[]> {
    const dbConfig = config.getDatabase();

    try {
      if (dbConfig.type === "sqlite") {
        return await this.getRoomPlayersSQLite(roomId);
      } else {
        return await this.getRoomPlayersMariaDB(roomId);
      }
    } catch (error) {
      logger.error("Error getting room players:", error);
      return [];
    }
  }

  private async getRoomPlayersSQLite(roomId: string): Promise<Player[]> {
    if (!this.sqlite) throw new Error("SQLite not initialized");

    const stmt = this.sqlite.prepare(
      "SELECT * FROM players WHERE room_id = ? ORDER BY joined_at ASC"
    );
    const rows = stmt.all(roomId) as any[];

    return rows.map((row) => this.mapSQLiteRowToPlayer(row));
  }

  private async getRoomPlayersMariaDB(roomId: string): Promise<Player[]> {
    const pool = await this.getMariaDBPool();

    const [rows] = await pool.execute(
      "SELECT * FROM players WHERE room_id = ? ORDER BY joined_at ASC",
      [roomId]
    );
    const playerRows = rows as any[];

    return playerRows.map((row) => this.mapMariaDBRowToPlayer(row));
  }

  public async resetRoom(roomId: string): Promise<Room | null> {
    const room = await this.getRoomById(roomId);
    if (!room) return null;

    const resetData: UpdateRoomData = {
      lives: room.maxLives,
      state: "lobby",
      timeline: [],
      gameEvents: [],
    };

    return await this.updateRoom(roomId, resetData);
  }

  // Helper methods to map database rows to objects
  private mapSQLiteRowToRoom(row: any): Room {
    return {
      id: row.id,
      maxLives: row.max_lives,
      numbersPerPlayer: row.numbers_per_player,
      lives: row.lives,
      state: row.state,
      hostId: row.host_id || "",
      timeline: JSON.parse(row.timeline || "[]"),
      gameEvents: JSON.parse(row.game_events || "[]"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapMariaDBRowToRoom(row: any): Room {
    return {
      id: row.id,
      maxLives: row.max_lives,
      numbersPerPlayer: row.numbers_per_player,
      lives: row.lives,
      state: row.state,
      hostId: row.host_id || "",
      timeline: Array.isArray(row.timeline)
        ? row.timeline
        : JSON.parse(row.timeline || "[]"),
      gameEvents: Array.isArray(row.game_events)
        ? row.game_events
        : JSON.parse(row.game_events || "[]"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapSQLiteRowToPlayer(row: any): Player {
    return {
      id: row.id,
      roomId: row.room_id,
      username: row.username,
      numbers: JSON.parse(row.numbers || "[]"),
      joinedAt: row.joined_at,
    };
  }

  private mapMariaDBRowToPlayer(row: any): Player {
    return {
      id: row.id,
      roomId: row.room_id,
      username: row.username,
      numbers: Array.isArray(row.numbers)
        ? row.numbers
        : JSON.parse(row.numbers || "[]"),
      joinedAt: row.joined_at,
    };
  }

  public async close(): Promise<void> {
    if (this.sqlite) {
      this.sqlite.close();
      this.sqlite = null;
    }
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
