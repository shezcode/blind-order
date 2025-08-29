import { Router, Request, Response } from "express";
import { RoomService } from "../services/roomService";
import { Player } from "../lib/types";

const router = Router();

router.get("/", (req, res) => {
  try {
    const allRooms = RoomService.getAllRooms();
    const allPlayers: (Player & { roomId: string })[] = [];

    // Recopilar jugadores de todas las salas
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

    return res.json({
      success: true,
      data: allPlayers,
      total: allPlayers.length,
    });
  } catch (error) {
    console.error("Error fetching players:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch players",
    });
  }
});

router.get("/:playerId", (req, res) => {
  try {
    const { playerId } = req.params;
    const allRooms = RoomService.getAllRooms();
    let foundPlayer: (Player & { roomId: string }) | null = null;

    // Buscar jugador en todas las salas
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
      return res.status(404).json({
        success: false,
        error: "Player not found",
      });
    }

    return res.json({
      success: true,
      data: foundPlayer,
    });
  } catch (error) {
    console.error("Error fetching player:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch player",
    });
  }
});

router.post("/", (req, res) => {
  try {
    const { roomId, username } = req.body;

    if (!roomId || !username) {
      return res.status(400).json({
        success: false,
        error: "roomId and username are required",
      });
    }

    const room = RoomService.getRoom(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: "Room not found",
      });
    }

    const existingPlayer = room.players.find((p) => p.username === username);
    if (existingPlayer) {
      return res.status(400).json({
        success: false,
        error: "Username already exists in this room",
      });
    }

    const playerId = `player_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const newPlayer: Player = {
      id: playerId,
      username: username.trim(),
      numbers: [],
    };

    // Agregar jugador a la sala
    room.players.push(newPlayer);

    // Si es el primer jugador, convertirlo en host
    if (room.players.length === 1) {
      room.hostId = playerId;
    }

    // Guardar cambios
    RoomService.addPlayer(roomId, newPlayer);
    RoomService.updateRoom(room);

    return res.status(201).json({
      success: true,
      data: { ...newPlayer, roomId },
      message: "Player added to room successfully",
    });
  } catch (error) {
    console.error("Error creating player:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create player",
    });
  }
});

router.put("/:playerId", (req, res) => {
  try {
    const { playerId } = req.params;
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: "username is required",
      });
    }

    const allRooms = RoomService.getAllRooms();
    let targetRoom = null;
    let targetPlayer = null;

    // Buscar jugador en todas las salas
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
      return res.status(404).json({
        success: false,
        error: "Player not found",
      });
    }

    // Verificar que el nuevo username no exista en la sala
    const existingPlayer = targetRoom.players.find(
      (p) => p.username === username.trim() && p.id !== playerId
    );
    if (existingPlayer) {
      return res.status(400).json({
        success: false,
        error: "Username already exists in this room",
      });
    }

    // Solo permitir cambios si la sala está en lobby o el juego no ha empezado
    if (targetRoom.state === "playing") {
      return res.status(400).json({
        success: false,
        error: "Cannot update player during active game",
      });
    }

    // Actualizar username
    targetPlayer.username = username.trim();

    // Guardar cambios
    RoomService.updateRoom(targetRoom);

    return res.json({
      success: true,
      data: { ...targetPlayer, roomId: targetRoom.id },
      message: "Player updated successfully",
    });
  } catch (error) {
    console.error("Error updating player:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update player",
    });
  }
});

router.delete("/:playerId", (req, res) => {
  try {
    const { playerId } = req.params;
    const allRooms = RoomService.getAllRooms();
    let targetRoom = null;
    let playerIndex = -1;

    // Buscar jugador en todas las salas
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
      return res.status(404).json({
        success: false,
        error: "Player not found",
      });
    }

    const wasHost = targetRoom.hostId === playerId;

    // Remover jugador
    targetRoom.players.splice(playerIndex, 1);
    RoomService.removePlayer(playerId);

    // Si era el host y quedan jugadores, asignar nuevo host
    if (wasHost && targetRoom.players.length > 0) {
      targetRoom.hostId = targetRoom.players[0].id;
      RoomService.setHost(targetRoom.id, targetRoom.hostId);
    }

    // Si no quedan jugadores, eliminar la sala
    if (targetRoom.players.length === 0) {
      RoomService.deleteRoom(targetRoom.id);
      return res.json({
        success: true,
        message: "Player removed and room deleted (no players left)",
      });
    }

    // Actualizar sala
    RoomService.updateRoom(targetRoom);

    return res.json({
      success: true,
      message: "Player removed successfully",
      ...(wasHost && { newHostId: targetRoom.hostId }),
    });
  } catch (error) {
    console.error("Error deleting player:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete player",
    });
  }
});

router.get("/:playerId/stats", (req, res) => {
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

    // Buscar jugador y calcular estadísticas
    for (const roomInfo of allRooms) {
      const room = RoomService.getRoom(roomInfo.id);
      if (room) {
        const player = room.players.find((p) => p.id === playerId);
        if (player) {
          playerStats.username = player.username;
          playerStats.currentRoom = room.id;
          playerStats.numbersRemaining = player.numbers.length;
          playerStats.isHost = room.hostId === playerId;

          // Contar juegos jugados basado en el timeline
          if (room.timeline.length > 0) {
            playerStats.gamesPlayed = 1;
          }
          break;
        }
      }
    }

    if (!playerStats.username) {
      return res.status(404).json({
        success: false,
        error: "Player not found",
      });
    }

    return res.json({
      success: true,
      data: playerStats,
    });
  } catch (error) {
    console.error("Error fetching player stats:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch player stats",
    });
  }
});

export default router;
