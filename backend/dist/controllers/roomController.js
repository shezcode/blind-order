"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomController = void 0;
const roomService_1 = require("../services/roomService");
const playerService_1 = require("../services/playerService");
const logger_1 = require("../utils/logger");
class RoomController {
    constructor() {
        this.roomService = new roomService_1.RoomService();
        this.playerService = new playerService_1.PlayerService();
    }
    async getAllRooms(req, res) {
        try {
            const rooms = await this.roomService.getAllRooms();
            // Add player counts for each room
            const roomsWithPlayerCounts = await Promise.all(rooms.map(async (room) => {
                const players = await this.roomService.getRoomPlayers(room.id);
                return {
                    ...room,
                    playerCount: players.length,
                    players,
                };
            }));
            res.json({
                success: true,
                data: roomsWithPlayerCounts,
                total: roomsWithPlayerCounts.length,
            });
        }
        catch (error) {
            logger_1.logger.error("Error in getAllRooms:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch rooms",
            });
        }
    }
    async getRoomById(req, res) {
        try {
            const { roomId } = req.params;
            const room = await this.roomService.getRoomById(roomId);
            if (!room) {
                res.status(404).json({
                    success: false,
                    error: "Room not found",
                });
                return;
            }
            // Add players to room data
            const players = await this.roomService.getRoomPlayers(roomId);
            const roomWithPlayers = {
                ...room,
                players,
                playerCount: players.length,
            };
            res.json({
                success: true,
                data: roomWithPlayers,
            });
        }
        catch (error) {
            logger_1.logger.error("Error in getRoomById:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch room",
            });
        }
    }
    async createRoom(req, res) {
        try {
            const { maxLives, numbersPerPlayer, hostId } = req.body;
            const roomData = {
                maxLives: maxLives || 3,
                numbersPerPlayer: numbersPerPlayer || 6,
                hostId: hostId || "",
            };
            const room = await this.roomService.createRoom(roomData);
            res.status(201).json({
                success: true,
                data: {
                    roomId: room.id,
                    room,
                },
                message: "Room created successfully",
            });
        }
        catch (error) {
            logger_1.logger.error("Error in createRoom:", error);
            res.status(500).json({
                success: false,
                error: "Failed to create room",
            });
        }
    }
    async updateRoom(req, res) {
        try {
            const { roomId } = req.params;
            const updateData = req.body;
            const room = await this.roomService.getRoomById(roomId);
            if (!room) {
                res.status(404).json({
                    success: false,
                    error: "Room not found",
                });
                return;
            }
            // Only allow updates if room is in lobby state
            if (room.state !== "lobby") {
                res.status(400).json({
                    success: false,
                    error: "Can only update rooms in lobby state",
                });
                return;
            }
            const updatedRoom = await this.roomService.updateRoom(roomId, updateData);
            if (!updatedRoom) {
                res.status(404).json({
                    success: false,
                    error: "Room not found",
                });
                return;
            }
            res.json({
                success: true,
                data: updatedRoom,
                message: "Room updated successfully",
            });
        }
        catch (error) {
            logger_1.logger.error("Error in updateRoom:", error);
            res.status(500).json({
                success: false,
                error: "Failed to update room",
            });
        }
    }
    async deleteRoom(req, res) {
        try {
            const { roomId } = req.params;
            const room = await this.roomService.getRoomById(roomId);
            if (!room) {
                res.status(404).json({
                    success: false,
                    error: "Room not found",
                });
                return;
            }
            const deleted = await this.roomService.deleteRoom(roomId);
            if (!deleted) {
                res.status(404).json({
                    success: false,
                    error: "Room not found",
                });
                return;
            }
            res.json({
                success: true,
                message: "Room deleted successfully",
            });
        }
        catch (error) {
            logger_1.logger.error("Error in deleteRoom:", error);
            res.status(500).json({
                success: false,
                error: "Failed to delete room",
            });
        }
    }
    async getRoomPlayers(req, res) {
        try {
            const { roomId } = req.params;
            const room = await this.roomService.getRoomById(roomId);
            if (!room) {
                res.status(404).json({
                    success: false,
                    error: "Room not found",
                });
                return;
            }
            const players = await this.roomService.getRoomPlayers(roomId);
            res.json({
                success: true,
                data: players,
                total: players.length,
            });
        }
        catch (error) {
            logger_1.logger.error("Error in getRoomPlayers:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch room players",
            });
        }
    }
    async resetRoom(req, res) {
        try {
            const { roomId } = req.params;
            const room = await this.roomService.getRoomById(roomId);
            if (!room) {
                res.status(404).json({
                    success: false,
                    error: "Room not found",
                });
                return;
            }
            const resetRoom = await this.roomService.resetRoom(roomId);
            if (!resetRoom) {
                res.status(404).json({
                    success: false,
                    error: "Room not found",
                });
                return;
            }
            res.json({
                success: true,
                data: resetRoom,
                message: "Room reset successfully",
            });
        }
        catch (error) {
            logger_1.logger.error("Error in resetRoom:", error);
            res.status(500).json({
                success: false,
                error: "Failed to reset room",
            });
        }
    }
}
exports.RoomController = RoomController;
