import { Request, Response } from "express";
import { RoomService } from "../services/roomService";
import { GameRoom, Player } from "../lib/types";

export class PlayerController {
  static getAllPlayers = (req: Request, res: Response) => {
    try {
      const allRooms = RoomService.getAllRooms();
      const allPlayers: (Player & { roomId: string })[] = [];

      allRooms.forEach((roomInfo) => {
        const room = RoomService.getRoom(roomInfo.id);
        if (room) {
          room.players.forEach((player) => {
            allPlayers.push({
              ...player,
              roomId: room.id,
            });
          });
        }
      });

      res.json({
        success: true,
        data: allPlayers,
        total: allPlayers.length,
      });
    } catch (error) {
      console.error("Error fetching players:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch players",
      });
    }
  };

  static getPlayerById = (req: Request, res: Response) => {
    try {
      const { playerId } = req.params;
      const allRooms = RoomService.getAllRooms();
      let foundPlayer: (Player & { roomId: string }) | null = null;

      for (const roomInfo of allRooms) {
        const room = RoomService.getRoom(roomInfo.id);
        if (room) {
          const player = room.players.find((p) => p.id === playerId);
          if (player) {
            foundPlayer = { ...player, roomId: room.id };
            break;
          }
        }
      }

      if (!foundPlayer) {
        res.status(404).json({
          success: false,
          error: "Player not found",
        });
        return;
      }

      res.json({
        success: true,
        data: foundPlayer,
      });
    } catch (error) {
      console.error("Error fetching player:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch player",
      });
    }
  };

  static createPlayer = (req: Request, res: Response) => {
    try {
      const { roomId, username } = req.body;

      const room = RoomService.getRoom(roomId);

      if (!room) {
        res.status(404).json({
          success: false,
          error: "Room not found",
        });
        return;
      }

      const existingPlayer = room.players.find((p) => p.username === username);
      if (existingPlayer) {
        res.status(400).json({
          success: false,
          error: "Username already exists in this room",
        });
        return;
      }

      const playerId = `player_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const newPlayer: Player = {
        id: playerId,
        username: username.trim(),
        numbers: [],
      };

      room.players.push(newPlayer);

      if (room.players.length === 1) {
        room.hostId = playerId;
      }

      RoomService.addPlayer(roomId, newPlayer);
      RoomService.updateRoom(room);

      res.status(201).json({
        success: true,
        data: { ...newPlayer, roomId },
        message: "Player added to room successfully",
      });
    } catch (error) {
      console.error("Error creating player:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create player",
      });
    }
  };

  static updatePlayer = (req: Request, res: Response) => {
    try {
      const { playerId } = req.params;
      const { username } = req.body;

      const allRooms = RoomService.getAllRooms();
      let targetRoom: GameRoom | null = null;
      let targetPlayer: Player | null = null;

      for (const roomInfo of allRooms) {
        const room = RoomService.getRoom(roomInfo.id);
        if (room) {
          const player = room.players.find((p) => p.id === playerId);
          if (player) {
            targetRoom = room;
            targetPlayer = player;
            break;
          }
        }
      }

      if (!targetPlayer || !targetRoom) {
        res.status(404).json({
          success: false,
          error: "Player not found",
        });
        return;
      }

      const existingPlayer = targetRoom.players.find(
        (p) => p.username === username.trim() && p.id !== playerId
      );
      if (existingPlayer) {
        res.status(400).json({
          success: false,
          error: "Username already exists in this room",
        });
        return;
      }

      if (targetRoom.state === "playing") {
        res.status(400).json({
          success: false,
          error: "Cannot update player during active game",
        });
        return;
      }

      targetPlayer.username = username.trim();

      RoomService.updateRoom(targetRoom);

      res.json({
        success: true,
        data: { ...targetPlayer, roomId: targetRoom.id },
        message: "Player updated successfully",
      });
    } catch (error) {
      console.error("Error updating player:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update player",
      });
    }
  };

  static deletePlayer = (req: Request, res: Response) => {
    try {
      const { playerId } = req.params;
      const allRooms = RoomService.getAllRooms();
      let targetRoom = null;
      let playerIndex = -1;

      for (const roomInfo of allRooms) {
        const room = RoomService.getRoom(roomInfo.id);
        if (room) {
          playerIndex = room.players.findIndex((p) => p.id === playerId);
          if (playerIndex !== -1) {
            targetRoom = room;
            break;
          }
        }
      }

      if (!targetRoom || playerIndex === -1) {
        res.status(404).json({
          success: false,
          error: "Player not found",
        });
        return;
      }

      const wasHost = targetRoom.hostId === playerId;

      targetRoom.players.splice(playerIndex, 1);
      RoomService.removePlayer(playerId);

      if (wasHost && targetRoom.players.length > 0) {
        targetRoom.hostId = targetRoom.players[0].id;
        RoomService.setHost(targetRoom.id, targetRoom.hostId);
      }

      if (targetRoom.players.length === 0) {
        RoomService.deleteRoom(targetRoom.id);
        res.json({
          success: true,
          message: "Player removed and room deleted (no players left)",
        });
        return;
      }

      RoomService.updateRoom(targetRoom);

      res.json({
        success: true,
        message: "Player removed successfully",
        ...(wasHost && { newHostId: targetRoom.hostId }),
      });
    } catch (error) {
      console.error("Error deleting player:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete player",
      });
    }
  };

  static getPlayerStats = (req: Request, res: Response) => {
    try {
      const { playerId } = req.params;
      const allRooms = RoomService.getAllRooms();
      let playerStats = {
        playerId,
        username: "",
        currentRoom: null as string | null,
        numbersRemaining: 0,
        gamesPlayed: 0,
        isHost: false,
      };

      for (const roomInfo of allRooms) {
        const room = RoomService.getRoom(roomInfo.id);
        if (room) {
          const player = room.players.find((p) => p.id === playerId);
          if (player) {
            playerStats.username = player.username;
            playerStats.currentRoom = room.id;
            playerStats.numbersRemaining = player.numbers.length;
            playerStats.isHost = room.hostId === playerId;

            if (room.timeline.length > 0) {
              playerStats.gamesPlayed = 1;
            }
            break;
          }
        }
      }

      if (!playerStats.username) {
        res.status(404).json({
          success: false,
          error: "Player not found",
        });
        return;
      }

      res.json({
        success: true,
        data: playerStats,
      });
    } catch (error) {
      console.error("Error fetching player stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch player stats",
      });
    }
  };
}
