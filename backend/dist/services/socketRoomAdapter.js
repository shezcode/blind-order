"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketRoomService = exports.SocketRoomAdapter = void 0;
const roomService_1 = require("./roomService");
const playerService_1 = require("./playerService");
class SocketRoomAdapter {
    constructor() {
        this.roomsCache = new Map();
        this.roomService = new roomService_1.RoomService();
        this.playerService = new playerService_1.PlayerService();
    }
    // Legacy methods expected by socket handlers
    static initialize() {
        // Already handled in the new services
        console.log("SocketRoomAdapter initialized");
    }
    // Create room and return legacy format
    async createRoom(roomId, maxLives, numbersPerPlayer) {
        const roomData = {
            maxLives,
            numbersPerPlayer,
        };
        // Use the new service but with the specific room ID (for socket compatibility)
        const room = await this.roomService.createRoom(roomData);
        // Convert to legacy format expected by sockets
        const legacyRoom = {
            id: roomId, // Use the provided roomId instead of generated one
            players: [],
            timeline: [],
            lives: maxLives,
            maxLives: maxLives,
            numbersPerPlayer: numbersPerPlayer,
            state: "lobby",
            hostId: "",
            gameEvents: [],
            createdAt: room.createdAt,
            updatedAt: room.updatedAt,
        };
        // Cache for socket operations
        this.roomsCache.set(roomId, legacyRoom);
        return legacyRoom;
    }
    // Get room with players populated
    async getRoom(roomId) {
        // Try cache first
        let room = this.roomsCache.get(roomId);
        if (!room) {
            // Get from database
            const dbRoom = await this.roomService.getRoomById(roomId);
            if (!dbRoom)
                return null;
            const players = await this.roomService.getRoomPlayers(roomId);
            room = {
                id: dbRoom.id,
                players: players.map((p) => ({
                    id: p.id,
                    username: p.username,
                    numbers: p.numbers,
                })),
                timeline: dbRoom.timeline,
                lives: dbRoom.lives,
                maxLives: dbRoom.maxLives,
                numbersPerPlayer: dbRoom.numbersPerPlayer,
                state: dbRoom.state,
                hostId: dbRoom.hostId,
                gameEvents: dbRoom.gameEvents,
                createdAt: dbRoom.createdAt,
                updatedAt: dbRoom.updatedAt,
            };
            // Cache it
            this.roomsCache.set(roomId, room);
        }
        return room;
    }
    // Add player to room
    async addPlayer(roomId, player) {
        const playerData = {
            roomId,
            username: player.username,
        };
        const newPlayer = await this.playerService.createPlayer(playerData);
        // Update cache
        const room = this.roomsCache.get(roomId);
        if (room) {
            room.players.push({
                id: newPlayer.id,
                username: newPlayer.username,
                numbers: newPlayer.numbers,
            });
            // If first player, make them host
            if (room.players.length === 1) {
                room.hostId = newPlayer.id;
                await this.roomService.updateRoom(roomId, { hostId: newPlayer.id });
            }
        }
    }
    // Remove player from room
    async removePlayer(playerId) {
        await this.playerService.deletePlayer(playerId);
        // Update cache - remove from all rooms
        for (const [roomId, room] of this.roomsCache.entries()) {
            const playerIndex = room.players.findIndex((p) => p.id === playerId);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                // If it was the host, assign new host
                if (room.hostId === playerId && room.players.length > 0) {
                    room.hostId = room.players[0].id;
                    await this.roomService.updateRoom(roomId, { hostId: room.hostId });
                }
                break;
            }
        }
    }
    // Update room state (for game mechanics)
    async updateRoom(room) {
        await this.roomService.updateRoom(room.id, {
            lives: room.lives,
            state: room.state,
            timeline: room.timeline,
            gameEvents: room.gameEvents,
            hostId: room.hostId,
        });
        // Update cache
        this.roomsCache.set(room.id, { ...room });
    }
    // Set host
    async setHost(roomId, playerId) {
        await this.roomService.updateRoom(roomId, { hostId: playerId });
        // Update cache
        const room = this.roomsCache.get(roomId);
        if (room) {
            room.hostId = playerId;
        }
    }
    // Delete room
    async deleteRoom(roomId) {
        await this.roomService.deleteRoom(roomId);
        this.roomsCache.delete(roomId);
    }
    // Get all rooms (for admin purposes)
    async getAllRooms() {
        const rooms = await this.roomService.getAllRooms();
        return rooms.map((room) => ({
            id: room.id,
            playerCount: 0, // Will be populated if needed
            state: room.state,
            createdAt: room.createdAt,
        }));
    }
    // Generate numbers for player (game logic)
    generateNumbers(count, max = 100) {
        const numbers = [];
        while (numbers.length < count) {
            const num = Math.floor(Math.random() * max) + 1;
            if (!numbers.includes(num)) {
                numbers.push(num);
            }
        }
        return numbers.sort((a, b) => a - b);
    }
    // Update player numbers
    async updatePlayerNumbers(roomId, playerId, numbers) {
        await this.playerService.updatePlayer(playerId, { numbers });
        // Update cache
        const room = this.roomsCache.get(roomId);
        if (room) {
            const player = room.players.find((p) => p.id === playerId);
            if (player) {
                player.numbers = numbers;
            }
        }
    }
    // Clean cache periodically
    clearCache() {
        this.roomsCache.clear();
    }
}
exports.SocketRoomAdapter = SocketRoomAdapter;
// Create singleton instance for socket handlers
exports.socketRoomService = new SocketRoomAdapter();
