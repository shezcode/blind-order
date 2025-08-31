"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerController = void 0;
const playerService_1 = require("../services/playerService");
const roomService_1 = require("../services/roomService");
const logger_1 = require("../utils/logger");
class PlayerController {
    constructor() {
        this.playerService = new playerService_1.PlayerService();
        this.roomService = new roomService_1.RoomService();
    }
    async getAllPlayers(req, res) {
        try {
            const players = await this.playerService.getAllPlayers();
            // Enhance players with room info and host status
            const enhancedPlayers = await Promise.all(players.map(async (player) => {
                try {
                    const room = await this.roomService.getRoomById(player.roomId);
                    return {
                        ...player,
                        isHost: room ? room.hostId === player.id : false,
                        roomState: room?.state || "unknown",
                    };
                }
                catch {
                    return {
                        ...player,
                        isHost: false,
                        roomState: "unknown",
                    };
                }
            }));
            res.json({
                success: true,
                data: enhancedPlayers,
                total: enhancedPlayers.length,
            });
        }
        catch (error) {
            logger_1.logger.error("Error in getAllPlayers:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch players",
            });
        }
    }
    async getPlayerById(req, res) {
        try {
            const { playerId } = req.params;
            const player = await this.playerService.getPlayerById(playerId);
            if (!player) {
                res.status(404).json({
                    success: false,
                    error: "Player not found",
                });
                return;
            }
            // Add room info and host status
            const room = await this.roomService.getRoomById(player.roomId);
            const enhancedPlayer = {
                ...player,
                isHost: room ? room.hostId === player.id : false,
                roomState: room?.state || "unknown",
            };
            res.json({
                success: true,
                data: enhancedPlayer,
            });
        }
        catch (error) {
            logger_1.logger.error("Error in getPlayerById:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch player",
            });
        }
    }
    async createPlayer(req, res) {
        try {
            const { roomId, username } = req.body;
            // Verify room exists
            const room = await this.roomService.getRoomById(roomId);
            if (!room) {
                res.status(404).json({
                    success: false,
                    error: "Room not found",
                });
                return;
            }
            // Check if username already exists in the room
            const existingPlayers = await this.roomService.getRoomPlayers(roomId);
            const usernameExists = existingPlayers.some((p) => p.username === username);
            if (usernameExists) {
                res.status(400).json({
                    success: false,
                    error: "Username already exists in this room",
                });
                return;
            }
            const playerData = {
                roomId,
                username: username.trim(),
            };
            const player = await this.playerService.createPlayer(playerData);
            // If this is the first player, make them host
            if (existingPlayers.length === 0) {
                await this.roomService.updateRoom(roomId, { hostId: player.id });
            }
            const enhancedPlayer = {
                ...player,
                roomId,
                isHost: existingPlayers.length === 0,
            };
            res.status(201).json({
                success: true,
                data: enhancedPlayer,
                message: "Player added to room successfully",
            });
        }
        catch (error) {
            logger_1.logger.error("Error in createPlayer:", error);
            res.status(500).json({
                success: false,
                error: "Failed to create player",
            });
        }
    }
    async updatePlayer(req, res) {
        try {
            const { playerId } = req.params;
            const updateData = req.body;
            const existingPlayer = await this.playerService.getPlayerById(playerId);
            if (!existingPlayer) {
                res.status(404).json({
                    success: false,
                    error: "Player not found",
                });
                return;
            }
            // Check if the room allows updates (not during active game)
            const room = await this.roomService.getRoomById(existingPlayer.roomId);
            if (room && room.state === "playing") {
                res.status(400).json({
                    success: false,
                    error: "Cannot update player during active game",
                });
                return;
            }
            // If updating username, check it doesn't exist in the room
            if (updateData.username) {
                const roomPlayers = await this.roomService.getRoomPlayers(existingPlayer.roomId);
                const usernameExists = roomPlayers.some((p) => p.username === updateData.username && p.id !== playerId);
                if (usernameExists) {
                    res.status(400).json({
                        success: false,
                        error: "Username already exists in this room",
                    });
                    return;
                }
            }
            const updatedPlayer = await this.playerService.updatePlayer(playerId, updateData);
            if (!updatedPlayer) {
                res.status(404).json({
                    success: false,
                    error: "Player not found",
                });
                return;
            }
            const enhancedPlayer = {
                ...updatedPlayer,
                roomId: updatedPlayer.roomId,
                isHost: room ? room.hostId === updatedPlayer.id : false,
            };
            res.json({
                success: true,
                data: enhancedPlayer,
                message: "Player updated successfully",
            });
        }
        catch (error) {
            logger_1.logger.error("Error in updatePlayer:", error);
            res.status(500).json({
                success: false,
                error: "Failed to update player",
            });
        }
    }
    async deletePlayer(req, res) {
        try {
            const { playerId } = req.params;
            const player = await this.playerService.getPlayerById(playerId);
            if (!player) {
                res.status(404).json({
                    success: false,
                    error: "Player not found",
                });
                return;
            }
            const room = await this.roomService.getRoomById(player.roomId);
            const wasHost = room ? room.hostId === playerId : false;
            const deleted = await this.playerService.deletePlayer(playerId);
            if (!deleted) {
                res.status(404).json({
                    success: false,
                    error: "Player not found",
                });
                return;
            }
            // If the deleted player was the host, assign new host or delete room
            if (wasHost && room) {
                const remainingPlayers = await this.roomService.getRoomPlayers(room.id);
                if (remainingPlayers.length === 0) {
                    // No players left, delete the room
                    await this.roomService.deleteRoom(room.id);
                    res.json({
                        success: true,
                        message: "Player removed and room deleted (no players left)",
                    });
                    return;
                }
                else {
                    // Assign new host
                    await this.roomService.updateRoom(room.id, {
                        hostId: remainingPlayers[0].id,
                    });
                    res.json({
                        success: true,
                        message: "Player removed successfully",
                        newHostId: remainingPlayers[0].id,
                    });
                    return;
                }
            }
            res.json({
                success: true,
                message: "Player removed successfully",
            });
        }
        catch (error) {
            logger_1.logger.error("Error in deletePlayer:", error);
            res.status(500).json({
                success: false,
                error: "Failed to delete player",
            });
        }
    }
    async getPlayerStats(req, res) {
        try {
            const { playerId } = req.params;
            const stats = await this.playerService.getPlayerStats(playerId);
            if (!stats) {
                res.status(404).json({
                    success: false,
                    error: "Player not found",
                });
                return;
            }
            res.json({
                success: true,
                data: stats,
            });
        }
        catch (error) {
            logger_1.logger.error("Error in getPlayerStats:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch player stats",
            });
        }
    }
    async getPlayersByRoom(req, res) {
        try {
            const { roomId } = req.params;
            // Verify room exists
            const room = await this.roomService.getRoomById(roomId);
            if (!room) {
                res.status(404).json({
                    success: false,
                    error: "Room not found",
                });
                return;
            }
            const players = await this.playerService.getPlayersByRoom(roomId);
            // Add host information
            const enhancedPlayers = players.map((player) => ({
                ...player,
                isHost: room.hostId === player.id,
            }));
            res.json({
                success: true,
                data: enhancedPlayers,
                total: enhancedPlayers.length,
            });
        }
        catch (error) {
            logger_1.logger.error("Error in getPlayersByRoom:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch players for room",
            });
        }
    }
}
exports.PlayerController = PlayerController;
