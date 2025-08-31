import {
  IPlayerService,
  Player,
  CreatePlayerData,
  UpdatePlayerData,
} from "../lib/types";
import { config } from "../../config/index";
import { logger } from "../utils/logger";
import Database from "better-sqlite3";
import mysql from "mysql2/promise";
import path from "path";

export class PlayerService implements IPlayerService {
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

  public generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public async createPlayer(data: CreatePlayerData): Promise<Player> {
    const dbConfig = config.getDatabase();
    const playerId = this.generatePlayerId();
    const now = new Date().toISOString();

    const playerData = {
      id: playerId,
      roomId: data.roomId,
      username: data.username,
      numbers: data.numbers || [],
      joinedAt: now,
    };

    try {
      if (dbConfig.type === "sqlite") {
        return await this.createPlayerSQLite(playerData);
      } else {
        return await this.createPlayerMariaDB(playerData);
      }
    } catch (error) {
      logger.error("Error creating player:", error);
      throw new Error("Failed to create player");
    }
  }

  private async createPlayerSQLite(playerData: Player): Promise<Player> {
    if (!this.sqlite) throw new Error("SQLite not initialized");

    const stmt = this.sqlite.prepare(`
      INSERT INTO players (id, room_id, username, numbers)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      playerData.id,
      playerData.roomId,
      playerData.username,
      JSON.stringify(playerData.numbers)
    );

    return playerData;
  }

  private async createPlayerMariaDB(playerData: Player): Promise<Player> {
    const pool = await this.getMariaDBPool();

    await pool.execute(
      `
      INSERT INTO players (id, room_id, username, numbers)
      VALUES (?, ?, ?, ?)
    `,
      [
        playerData.id,
        playerData.roomId,
        playerData.username,
        JSON.stringify(playerData.numbers),
      ]
    );

    return playerData;
  }

  public async getPlayerById(id: string): Promise<Player | null> {
    const dbConfig = config.getDatabase();

    try {
      if (dbConfig.type === "sqlite") {
        return await this.getPlayerByIdSQLite(id);
      } else {
        return await this.getPlayerByIdMariaDB(id);
      }
    } catch (error) {
      logger.error("Error getting player:", error);
      return null;
    }
  }

  private async getPlayerByIdSQLite(id: string): Promise<Player | null> {
    if (!this.sqlite) throw new Error("SQLite not initialized");

    const stmt = this.sqlite.prepare("SELECT * FROM players WHERE id = ?");
    const row = stmt.get(id) as any;

    if (!row) return null;

    return this.mapSQLiteRowToPlayer(row);
  }

  private async getPlayerByIdMariaDB(id: string): Promise<Player | null> {
    const pool = await this.getMariaDBPool();

    const [rows] = await pool.execute("SELECT * FROM players WHERE id = ?", [
      id,
    ]);
    const playerRows = rows as any[];

    if (playerRows.length === 0) return null;

    return this.mapMariaDBRowToPlayer(playerRows[0]);
  }

  public async updatePlayer(
    id: string,
    data: UpdatePlayerData
  ): Promise<Player | null> {
    const dbConfig = config.getDatabase();

    try {
      if (dbConfig.type === "sqlite") {
        return await this.updatePlayerSQLite(id, data);
      } else {
        return await this.updatePlayerMariaDB(id, data);
      }
    } catch (error) {
      logger.error("Error updating player:", error);
      throw new Error("Failed to update player");
    }
  }

  private async updatePlayerSQLite(
    id: string,
    data: UpdatePlayerData
  ): Promise<Player | null> {
    if (!this.sqlite) throw new Error("SQLite not initialized");

    const existingPlayer = await this.getPlayerByIdSQLite(id);
    if (!existingPlayer) return null;

    const updatedData = {
      username: data.username ?? existingPlayer.username,
      numbers: data.numbers ?? existingPlayer.numbers,
    };

    const stmt = this.sqlite.prepare(`
      UPDATE players 
      SET username = ?, numbers = ?
      WHERE id = ?
    `);

    stmt.run(updatedData.username, JSON.stringify(updatedData.numbers), id);

    return await this.getPlayerByIdSQLite(id);
  }

  private async updatePlayerMariaDB(
    id: string,
    data: UpdatePlayerData
  ): Promise<Player | null> {
    const pool = await this.getMariaDBPool();

    const existingPlayer = await this.getPlayerByIdMariaDB(id);
    if (!existingPlayer) return null;

    const updatedData = {
      username: data.username ?? existingPlayer.username,
      numbers: data.numbers ?? existingPlayer.numbers,
    };

    await pool.execute(
      `
      UPDATE players 
      SET username = ?, numbers = ?
      WHERE id = ?
    `,
      [updatedData.username, JSON.stringify(updatedData.numbers), id]
    );

    return await this.getPlayerByIdMariaDB(id);
  }

  public async deletePlayer(id: string): Promise<boolean> {
    const dbConfig = config.getDatabase();

    try {
      if (dbConfig.type === "sqlite") {
        return await this.deletePlayerSQLite(id);
      } else {
        return await this.deletePlayerMariaDB(id);
      }
    } catch (error) {
      logger.error("Error deleting player:", error);
      throw new Error("Failed to delete player");
    }
  }

  private async deletePlayerSQLite(id: string): Promise<boolean> {
    if (!this.sqlite) throw new Error("SQLite not initialized");

    const stmt = this.sqlite.prepare("DELETE FROM players WHERE id = ?");
    const result = stmt.run(id);

    return result.changes > 0;
  }

  private async deletePlayerMariaDB(id: string): Promise<boolean> {
    const pool = await this.getMariaDBPool();

    const [result] = await pool.execute("DELETE FROM players WHERE id = ?", [
      id,
    ]);
    const deleteResult = result as any;

    return deleteResult.affectedRows > 0;
  }

  public async getAllPlayers(): Promise<Player[]> {
    const dbConfig = config.getDatabase();

    try {
      if (dbConfig.type === "sqlite") {
        return await this.getAllPlayersSQLite();
      } else {
        return await this.getAllPlayersMariaDB();
      }
    } catch (error) {
      logger.error("Error getting all players:", error);
      return [];
    }
  }

  private async getAllPlayersSQLite(): Promise<Player[]> {
    if (!this.sqlite) throw new Error("SQLite not initialized");

    const stmt = this.sqlite.prepare(
      "SELECT * FROM players ORDER BY joined_at DESC"
    );
    const rows = stmt.all() as any[];

    return rows.map((row) => this.mapSQLiteRowToPlayer(row));
  }

  private async getAllPlayersMariaDB(): Promise<Player[]> {
    const pool = await this.getMariaDBPool();

    const [rows] = await pool.execute(
      "SELECT * FROM players ORDER BY joined_at DESC"
    );
    const playerRows = rows as any[];

    return playerRows.map((row) => this.mapMariaDBRowToPlayer(row));
  }

  public async getPlayersByRoom(roomId: string): Promise<Player[]> {
    const dbConfig = config.getDatabase();

    try {
      if (dbConfig.type === "sqlite") {
        return await this.getPlayersByRoomSQLite(roomId);
      } else {
        return await this.getPlayersByRoomMariaDB(roomId);
      }
    } catch (error) {
      logger.error("Error getting players by room:", error);
      return [];
    }
  }

  private async getPlayersByRoomSQLite(roomId: string): Promise<Player[]> {
    if (!this.sqlite) throw new Error("SQLite not initialized");

    const stmt = this.sqlite.prepare(
      "SELECT * FROM players WHERE room_id = ? ORDER BY joined_at ASC"
    );
    const rows = stmt.all(roomId) as any[];

    return rows.map((row) => this.mapSQLiteRowToPlayer(row));
  }

  private async getPlayersByRoomMariaDB(roomId: string): Promise<Player[]> {
    const pool = await this.getMariaDBPool();

    const [rows] = await pool.execute(
      "SELECT * FROM players WHERE room_id = ? ORDER BY joined_at ASC",
      [roomId]
    );
    const playerRows = rows as any[];

    return playerRows.map((row) => this.mapMariaDBRowToPlayer(row));
  }

  public async getPlayerStats(playerId: string): Promise<any> {
    const player = await this.getPlayerById(playerId);
    if (!player) return null;

    // Basic stats - can be extended
    return {
      playerId: player.id,
      username: player.username,
      currentRoom: player.roomId,
      numbersRemaining: player.numbers.length,
      joinedAt: player.joinedAt,
    };
  }

  // Helper methods to map database rows to objects
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
