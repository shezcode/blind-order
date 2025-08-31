"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.database = exports.DatabaseManager = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const index_1 = require("./index");
const logger_1 = require("../utils/logger");
class DatabaseManager {
    constructor() {
        this.connection = null;
        this.pool = null;
    }
    async initialize() {
        try {
            const dbConfig = index_1.config.getDatabase();
            if (dbConfig.type === "mariadb") {
                await this.initializeMariaDB();
            }
            else {
                throw new Error(`Unsupported database type: ${dbConfig.type}`);
            }
            await this.createTables();
            await this.seedDatabase();
            logger_1.logger.info("Database initialized successfully");
        }
        catch (error) {
            logger_1.logger.error("Failed to init database: ", error);
            throw error;
        }
    }
    async initializeMariaDB() {
        const dbConfig = index_1.config.getDatabase();
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
        const connection = await this.pool.getConnection();
        await connection.ping();
        connection.release();
    }
    async createTables() {
        if (!this.pool)
            throw new Error("Database not initialized");
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
            logger_1.logger.info("Database tables created successfully");
        }
        catch (error) {
            logger_1.logger.error("Failed to create tables", error);
            throw error;
        }
    }
    async seedDatabase() {
        if (!this.pool)
            return;
        try {
            const [rooms] = await this.pool.execute("SELECT COUNT(*) as count FROM rooms");
            const roomCount = rooms[0].count;
            if (roomCount > 0) {
                logger_1.logger.info("Database already contains data, skipping seed");
                return;
            }
            const sampleRooms = [
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
            logger_1.logger.info(`Seeded ${sampleRooms.length} sample rooms`);
        }
        catch (error) {
            logger_1.logger.error("Failed to seed db", error);
        }
    }
    getPool() {
        if (!this.pool) {
            throw new Error("Db not initialized");
        }
        return this.pool;
    }
    async query(sql, params) {
        if (!this.pool)
            throw new Error("Db not initialized");
        try {
            const [results] = await this.pool.execute(sql, params);
            return results;
        }
        catch (error) {
            logger_1.logger.error("Db query failed", { sql, params, error });
            throw error;
        }
    }
    async close() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            logger_1.logger.info("Db connection closed");
        }
    }
}
exports.DatabaseManager = DatabaseManager;
exports.database = new DatabaseManager();
