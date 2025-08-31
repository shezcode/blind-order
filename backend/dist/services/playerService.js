"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerService = void 0;
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const promise_1 = __importDefault(require("mysql2/promise"));
const path_1 = __importDefault(require("path"));
class PlayerService {
    constructor() {
        this.sqlite = null;
        this.pool = null;
        this.initializeDatabase();
    }
    initializeDatabase() {
        const dbConfig = config_1.config.getDatabase();
        if (dbConfig.type === "sqlite") {
            this.initializeSQLite();
        }
    }
    initializeSQLite() {
        const dataDir = path_1.default.join(process.cwd(), "data");
        const dbPath = path_1.default.join(dataDir, "blindorder.db");
        this.sqlite = new better_sqlite3_1.default(dbPath);
        this.sqlite.pragma("foreign_keys = ON");
    }
    async getMariaDBPool() {
        if (!this.pool) {
            const dbConfig = config_1.config.getDatabase();
            this.pool = promise_1.default.createPool({
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
    generatePlayerId() {
        return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    async createPlayer(data) {
        const dbConfig = config_1.config.getDatabase();
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
            }
            else {
                return await this.createPlayerMariaDB(playerData);
            }
        }
        catch (error) {
            logger_1.logger.error("Error creating player:", error);
            throw new Error("Failed to create player");
        }
    }
    async createPlayerSQLite(playerData) {
        if (!this.sqlite)
            throw new Error("SQLite not initialized");
        const stmt = this.sqlite.prepare(`
      INSERT INTO players (id, room_id, username, numbers)
      VALUES (?, ?, ?, ?)
    `);
        stmt.run(playerData.id, playerData.roomId, playerData.username, JSON.stringify(playerData.numbers));
        return playerData;
    }
    async createPlayerMariaDB(playerData) {
        const pool = await this.getMariaDBPool();
        await pool.execute(`
      INSERT INTO players (id, room_id, username, numbers)
      VALUES (?, ?, ?, ?)
    `, [
            playerData.id,
            playerData.roomId,
            playerData.username,
            JSON.stringify(playerData.numbers),
        ]);
        return playerData;
    }
    async getPlayerById(id) {
        const dbConfig = config_1.config.getDatabase();
        try {
            if (dbConfig.type === "sqlite") {
                return await this.getPlayerByIdSQLite(id);
            }
            else {
                return await this.getPlayerByIdMariaDB(id);
            }
        }
        catch (error) {
            logger_1.logger.error("Error getting player:", error);
            return null;
        }
    }
    async getPlayerByIdSQLite(id) {
        if (!this.sqlite)
            throw new Error("SQLite not initialized");
        const stmt = this.sqlite.prepare("SELECT * FROM players WHERE id = ?");
        const row = stmt.get(id);
        if (!row)
            return null;
        return this.mapSQLiteRowToPlayer(row);
    }
    async getPlayerByIdMariaDB(id) {
        const pool = await this.getMariaDBPool();
        const [rows] = await pool.execute("SELECT * FROM players WHERE id = ?", [
            id,
        ]);
        const playerRows = rows;
        if (playerRows.length === 0)
            return null;
        return this.mapMariaDBRowToPlayer(playerRows[0]);
    }
    async updatePlayer(id, data) {
        const dbConfig = config_1.config.getDatabase();
        try {
            if (dbConfig.type === "sqlite") {
                return await this.updatePlayerSQLite(id, data);
            }
            else {
                return await this.updatePlayerMariaDB(id, data);
            }
        }
        catch (error) {
            logger_1.logger.error("Error updating player:", error);
            throw new Error("Failed to update player");
        }
    }
    async updatePlayerSQLite(id, data) {
        if (!this.sqlite)
            throw new Error("SQLite not initialized");
        const existingPlayer = await this.getPlayerByIdSQLite(id);
        if (!existingPlayer)
            return null;
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
    async updatePlayerMariaDB(id, data) {
        const pool = await this.getMariaDBPool();
        const existingPlayer = await this.getPlayerByIdMariaDB(id);
        if (!existingPlayer)
            return null;
        const updatedData = {
            username: data.username ?? existingPlayer.username,
            numbers: data.numbers ?? existingPlayer.numbers,
        };
        await pool.execute(`
      UPDATE players 
      SET username = ?, numbers = ?
      WHERE id = ?
    `, [updatedData.username, JSON.stringify(updatedData.numbers), id]);
        return await this.getPlayerByIdMariaDB(id);
    }
    async deletePlayer(id) {
        const dbConfig = config_1.config.getDatabase();
        try {
            if (dbConfig.type === "sqlite") {
                return await this.deletePlayerSQLite(id);
            }
            else {
                return await this.deletePlayerMariaDB(id);
            }
        }
        catch (error) {
            logger_1.logger.error("Error deleting player:", error);
            throw new Error("Failed to delete player");
        }
    }
    async deletePlayerSQLite(id) {
        if (!this.sqlite)
            throw new Error("SQLite not initialized");
        const stmt = this.sqlite.prepare("DELETE FROM players WHERE id = ?");
        const result = stmt.run(id);
        return result.changes > 0;
    }
    async deletePlayerMariaDB(id) {
        const pool = await this.getMariaDBPool();
        const [result] = await pool.execute("DELETE FROM players WHERE id = ?", [
            id,
        ]);
        const deleteResult = result;
        return deleteResult.affectedRows > 0;
    }
    async getAllPlayers() {
        const dbConfig = config_1.config.getDatabase();
        try {
            if (dbConfig.type === "sqlite") {
                return await this.getAllPlayersSQLite();
            }
            else {
                return await this.getAllPlayersMariaDB();
            }
        }
        catch (error) {
            logger_1.logger.error("Error getting all players:", error);
            return [];
        }
    }
    async getAllPlayersSQLite() {
        if (!this.sqlite)
            throw new Error("SQLite not initialized");
        const stmt = this.sqlite.prepare("SELECT * FROM players ORDER BY joined_at DESC");
        const rows = stmt.all();
        return rows.map((row) => this.mapSQLiteRowToPlayer(row));
    }
    async getAllPlayersMariaDB() {
        const pool = await this.getMariaDBPool();
        const [rows] = await pool.execute("SELECT * FROM players ORDER BY joined_at DESC");
        const playerRows = rows;
        return playerRows.map((row) => this.mapMariaDBRowToPlayer(row));
    }
    async getPlayersByRoom(roomId) {
        const dbConfig = config_1.config.getDatabase();
        try {
            if (dbConfig.type === "sqlite") {
                return await this.getPlayersByRoomSQLite(roomId);
            }
            else {
                return await this.getPlayersByRoomMariaDB(roomId);
            }
        }
        catch (error) {
            logger_1.logger.error("Error getting players by room:", error);
            return [];
        }
    }
    async getPlayersByRoomSQLite(roomId) {
        if (!this.sqlite)
            throw new Error("SQLite not initialized");
        const stmt = this.sqlite.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY joined_at ASC");
        const rows = stmt.all(roomId);
        return rows.map((row) => this.mapSQLiteRowToPlayer(row));
    }
    async getPlayersByRoomMariaDB(roomId) {
        const pool = await this.getMariaDBPool();
        const [rows] = await pool.execute("SELECT * FROM players WHERE room_id = ? ORDER BY joined_at ASC", [roomId]);
        const playerRows = rows;
        return playerRows.map((row) => this.mapMariaDBRowToPlayer(row));
    }
    async getPlayerStats(playerId) {
        const player = await this.getPlayerById(playerId);
        if (!player)
            return null;
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
    mapSQLiteRowToPlayer(row) {
        return {
            id: row.id,
            roomId: row.room_id,
            username: row.username,
            numbers: JSON.parse(row.numbers || "[]"),
            joinedAt: row.joined_at,
        };
    }
    mapMariaDBRowToPlayer(row) {
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
    async close() {
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
exports.PlayerService = PlayerService;
