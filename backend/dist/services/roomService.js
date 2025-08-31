"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomService = void 0;
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const promise_1 = __importDefault(require("mysql2/promise"));
const path_1 = __importDefault(require("path"));
class RoomService {
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
        // MariaDB will be initialized when needed
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
    generateRoomId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    async createRoom(data) {
        const dbConfig = config_1.config.getDatabase();
        const roomId = this.generateRoomId();
        const now = new Date().toISOString();
        const roomData = {
            id: roomId,
            maxLives: data.maxLives,
            numbersPerPlayer: data.numbersPerPlayer,
            lives: data.maxLives,
            state: "lobby",
            hostId: data.hostId || "",
            timeline: [],
            gameEvents: [],
            createdAt: now,
            updatedAt: now,
        };
        try {
            if (dbConfig.type === "sqlite") {
                return await this.createRoomSQLite(roomData);
            }
            else {
                return await this.createRoomMariaDB(roomData);
            }
        }
        catch (error) {
            logger_1.logger.error("Error creating room:", error);
            throw new Error("Failed to create room");
        }
    }
    async createRoomSQLite(roomData) {
        if (!this.sqlite)
            throw new Error("SQLite not initialized");
        const stmt = this.sqlite.prepare(`
      INSERT INTO rooms (id, max_lives, numbers_per_player, lives, state, host_id, timeline, game_events)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(roomData.id, roomData.maxLives, roomData.numbersPerPlayer, roomData.lives, roomData.state, roomData.hostId, JSON.stringify(roomData.timeline), JSON.stringify(roomData.gameEvents));
        return roomData;
    }
    async createRoomMariaDB(roomData) {
        const pool = await this.getMariaDBPool();
        const [result] = await pool.execute(`
      INSERT INTO rooms (id, max_lives, numbers_per_player, lives, state, host_id, timeline, game_events)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            roomData.id,
            roomData.maxLives,
            roomData.numbersPerPlayer,
            roomData.lives,
            roomData.state,
            roomData.hostId,
            JSON.stringify(roomData.timeline),
            JSON.stringify(roomData.gameEvents),
        ]);
        return roomData;
    }
    async getRoomById(id) {
        const dbConfig = config_1.config.getDatabase();
        try {
            if (dbConfig.type === "sqlite") {
                return await this.getRoomByIdSQLite(id);
            }
            else {
                return await this.getRoomByIdMariaDB(id);
            }
        }
        catch (error) {
            logger_1.logger.error("Error getting room:", error);
            return null;
        }
    }
    async getRoomByIdSQLite(id) {
        if (!this.sqlite)
            throw new Error("SQLite not initialized");
        const stmt = this.sqlite.prepare("SELECT * FROM rooms WHERE id = ?");
        const row = stmt.get(id);
        if (!row)
            return null;
        return this.mapSQLiteRowToRoom(row);
    }
    async getRoomByIdMariaDB(id) {
        const pool = await this.getMariaDBPool();
        const [rows] = await pool.execute("SELECT * FROM rooms WHERE id = ?", [id]);
        const roomRows = rows;
        if (roomRows.length === 0)
            return null;
        return this.mapMariaDBRowToRoom(roomRows[0]);
    }
    async updateRoom(id, data) {
        const dbConfig = config_1.config.getDatabase();
        try {
            if (dbConfig.type === "sqlite") {
                return await this.updateRoomSQLite(id, data);
            }
            else {
                return await this.updateRoomMariaDB(id, data);
            }
        }
        catch (error) {
            logger_1.logger.error("Error updating room:", error);
            throw new Error("Failed to update room");
        }
    }
    async updateRoomSQLite(id, data) {
        if (!this.sqlite)
            throw new Error("SQLite not initialized");
        const existingRoom = await this.getRoomByIdSQLite(id);
        if (!existingRoom)
            return null;
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
        stmt.run(updatedData.maxLives, updatedData.numbersPerPlayer, updatedData.lives, updatedData.state, updatedData.hostId, JSON.stringify(updatedData.timeline), JSON.stringify(updatedData.gameEvents), id);
        return await this.getRoomByIdSQLite(id);
    }
    async updateRoomMariaDB(id, data) {
        const pool = await this.getMariaDBPool();
        const existingRoom = await this.getRoomByIdMariaDB(id);
        if (!existingRoom)
            return null;
        const updatedData = {
            maxLives: data.maxLives ?? existingRoom.maxLives,
            numbersPerPlayer: data.numbersPerPlayer ?? existingRoom.numbersPerPlayer,
            lives: data.lives ?? existingRoom.lives,
            state: data.state ?? existingRoom.state,
            hostId: data.hostId ?? existingRoom.hostId,
            timeline: data.timeline ?? existingRoom.timeline,
            gameEvents: data.gameEvents ?? existingRoom.gameEvents,
        };
        await pool.execute(`
      UPDATE rooms 
      SET max_lives = ?, numbers_per_player = ?, lives = ?, state = ?, 
          host_id = ?, timeline = ?, game_events = ?
      WHERE id = ?
    `, [
            updatedData.maxLives,
            updatedData.numbersPerPlayer,
            updatedData.lives,
            updatedData.state,
            updatedData.hostId,
            JSON.stringify(updatedData.timeline),
            JSON.stringify(updatedData.gameEvents),
            id,
        ]);
        return await this.getRoomByIdMariaDB(id);
    }
    async deleteRoom(id) {
        const dbConfig = config_1.config.getDatabase();
        try {
            if (dbConfig.type === "sqlite") {
                return await this.deleteRoomSQLite(id);
            }
            else {
                return await this.deleteRoomMariaDB(id);
            }
        }
        catch (error) {
            logger_1.logger.error("Error deleting room:", error);
            throw new Error("Failed to delete room");
        }
    }
    async deleteRoomSQLite(id) {
        if (!this.sqlite)
            throw new Error("SQLite not initialized");
        const stmt = this.sqlite.prepare("DELETE FROM rooms WHERE id = ?");
        const result = stmt.run(id);
        return result.changes > 0;
    }
    async deleteRoomMariaDB(id) {
        const pool = await this.getMariaDBPool();
        const [result] = await pool.execute("DELETE FROM rooms WHERE id = ?", [id]);
        const deleteResult = result;
        return deleteResult.affectedRows > 0;
    }
    async getAllRooms() {
        const dbConfig = config_1.config.getDatabase();
        try {
            if (dbConfig.type === "sqlite") {
                return await this.getAllRoomsSQLite();
            }
            else {
                return await this.getAllRoomsMariaDB();
            }
        }
        catch (error) {
            logger_1.logger.error("Error getting all rooms:", error);
            return [];
        }
    }
    async getAllRoomsSQLite() {
        if (!this.sqlite)
            throw new Error("SQLite not initialized");
        const stmt = this.sqlite.prepare("SELECT * FROM rooms ORDER BY created_at DESC");
        const rows = stmt.all();
        return rows.map((row) => this.mapSQLiteRowToRoom(row));
    }
    async getAllRoomsMariaDB() {
        const pool = await this.getMariaDBPool();
        const [rows] = await pool.execute("SELECT * FROM rooms ORDER BY created_at DESC");
        const roomRows = rows;
        return roomRows.map((row) => this.mapMariaDBRowToRoom(row));
    }
    async getRoomPlayers(roomId) {
        const dbConfig = config_1.config.getDatabase();
        try {
            if (dbConfig.type === "sqlite") {
                return await this.getRoomPlayersSQLite(roomId);
            }
            else {
                return await this.getRoomPlayersMariaDB(roomId);
            }
        }
        catch (error) {
            logger_1.logger.error("Error getting room players:", error);
            return [];
        }
    }
    async getRoomPlayersSQLite(roomId) {
        if (!this.sqlite)
            throw new Error("SQLite not initialized");
        const stmt = this.sqlite.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY joined_at ASC");
        const rows = stmt.all(roomId);
        return rows.map((row) => this.mapSQLiteRowToPlayer(row));
    }
    async getRoomPlayersMariaDB(roomId) {
        const pool = await this.getMariaDBPool();
        const [rows] = await pool.execute("SELECT * FROM players WHERE room_id = ? ORDER BY joined_at ASC", [roomId]);
        const playerRows = rows;
        return playerRows.map((row) => this.mapMariaDBRowToPlayer(row));
    }
    async resetRoom(roomId) {
        const room = await this.getRoomById(roomId);
        if (!room)
            return null;
        const resetData = {
            lives: room.maxLives,
            state: "lobby",
            timeline: [],
            gameEvents: [],
        };
        return await this.updateRoom(roomId, resetData);
    }
    // Helper methods to map database rows to objects
    mapSQLiteRowToRoom(row) {
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
    mapMariaDBRowToRoom(row) {
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
exports.RoomService = RoomService;
