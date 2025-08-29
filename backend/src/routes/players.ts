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

    res.json({
      success: true,
      data: allPlayers,
      total: allPlayers.length,
    });
    return;
  } catch (error) {
    console.error("Error fetching players:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch players",
    });
    return;
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
    return;
  } catch (error) {
    console.error("Error fetching player:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch player",
    });
    return;
  }
});

router.post("/", (req, res) => {
  try {
    const { roomId, username } = req.body;

    if (!roomId || !username) {
      res.status(400).json({
        success: false,
        error: "roomId and username are required",
      });
      return;
    }

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

    // Agregar jugador a la sala
    room.players.push(newPlayer);

    // Si es el primer jugador, convertirlo en host
    if (room.players.length === 1) {
      room.hostId = playerId;
    }

    // Guardar cambios
    RoomService.addPlayer(roomId, newPlayer);
    RoomService.updateRoom(room);

    res.status(201).json({
      success: true,
      data: { ...newPlayer, roomId },
      message: "Player added to room successfully",
    });
    return;
  } catch (error) {
    console.error("Error creating player:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create player",
    });
    return;
  }
});

router.put("/:playerId", (req, res) => {
  try {
    const { playerId } = req.params;
    const { username } = req.body;

    if (!username) {
      res.status(400).json({
        success: false,
        error: "username is required",
      });
      return;
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
      res.status(404).json({
        success: false,
        error: "Player not found",
      });
      return;
    }

    // Verificar que el nuevo username no exista en la sala
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

    // Solo permitir cambios si la sala está en lobby o el juego no ha empezado
    if (targetRoom.state === "playing") {
      res.status(400).json({
        success: false,
        error: "Cannot update player during active game",
      });
      return;
    }

    // Actualizar username
    targetPlayer.username = username.trim();

    // Guardar cambios
    RoomService.updateRoom(targetRoom);

    res.json({
      success: true,
      data: { ...targetPlayer, roomId: targetRoom.id },
      message: "Player updated successfully",
    });
    return;
  } catch (error) {
    console.error("Error updating player:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update player",
    });
    return;
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
      res.status(404).json({
        success: false,
        error: "Player not found",
      });
      return;
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
      res.json({
        success: true,
        message: "Player removed and room deleted (no players left)",
      });
      return;
    }

    // Actualizar sala
    RoomService.updateRoom(targetRoom);

    res.json({
      success: true,
      message: "Player removed successfully",
      ...(wasHost && { newHostId: targetRoom.hostId }),
    });
    return;
  } catch (error) {
    console.error("Error deleting player:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete player",
    });
    return;
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
    return;
  } catch (error) {
    console.error("Error fetching player stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch player stats",
    });
    return;
  }
});

export default router;
