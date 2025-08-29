import { Router, Request, Response } from "express";
import { RoomService } from "../services/roomService";

const router = Router();

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

router.get("/", (req: Request, res: Response) => {
  try {
    const allRooms = RoomService.getAllRooms();
    res.json({
      success: true,
      data: allRooms,
      total: allRooms.length,
    });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch rooms",
    });
  }
});

router.get("/:roomId", (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const room = RoomService.getRoom(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: "Room not found",
      });
    }

    res.json({
      success: true,
      data: room,
    });
  } catch (error) {
    console.error("Error fetching room:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch room",
    });
  }
});

router.post("/", (req: Request, res: Response) => {
  try {
    const roomId = generateRoomCode();
    const { maxLives = 3, numbersPerPlayer = 6, hostName } = req.body;

    // Validación
    if (maxLives < 1 || maxLives > 10) {
      return res.status(400).json({
        success: false,
        error: "Max lives must be between 1 and 10",
      });
    }

    if (numbersPerPlayer < 1 || numbersPerPlayer > 20) {
      return res.status(400).json({
        success: false,
        error: "Numbers per player must be between 1 and 20",
      });
    }

    const room = RoomService.createRoom(roomId, maxLives, numbersPerPlayer);

    res.status(201).json({
      success: true,
      data: { roomId, room },
      message: "Room created successfully",
    });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create room",
    });
  }
});

router.put("/:roomId", (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const updates = req.body;

    const room = RoomService.getRoom(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: "Room not found",
      });
    }

    // Solo permitir actualizaciones si la sala está en lobby
    if (room.state !== "lobby") {
      return res.status(400).json({
        success: false,
        error: "Can only update rooms in lobby state",
      });
    }

    // Aplicar actualizaciones permitidas
    if (updates.maxLives !== undefined) {
      if (updates.maxLives < 1 || updates.maxLives > 10) {
        return res.status(400).json({
          success: false,
          error: "Max lives must be between 1 and 10",
        });
      }
      room.maxLives = updates.maxLives;
      room.lives = updates.maxLives; // Reset current lives
    }

    if (updates.numbersPerPlayer !== undefined) {
      if (updates.numbersPerPlayer < 1 || updates.numbersPerPlayer > 20) {
        return res.status(400).json({
          success: false,
          error: "Numbers per player must be between 1 and 20",
        });
      }
      room.numbersPerPlayer = updates.numbersPerPlayer;
    }

    // Guardar cambios
    RoomService.updateRoom(room);

    res.json({
      success: true,
      data: room,
      message: "Room updated successfully",
    });
  } catch (error) {
    console.error("Error updating room:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update room",
    });
  }
});

router.delete("/:roomId", (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const room = RoomService.getRoom(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: "Room not found",
      });
    }

    RoomService.deleteRoom(roomId);

    res.json({
      success: true,
      message: "Room deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting room:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete room",
    });
  }
});

router.get("/:roomId/players", (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const room = RoomService.getRoom(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: "Room not found",
      });
    }

    res.json({
      success: true,
      data: room.players,
      total: room.players.length,
    });
  } catch (error) {
    console.error("Error fetching room players:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch room players",
    });
  }
});

router.post("/:roomId/reset", (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const room = RoomService.getRoom(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: "Room not found",
      });
    }

    // Reset room to lobby state
    room.state = "lobby";
    room.timeline = [];
    room.lives = room.maxLives;
    room.gameEvents = [];
    room.players.forEach((player) => {
      player.numbers = [];
    });

    RoomService.updateRoom(room);

    res.json({
      success: true,
      data: room,
      message: "Room reset successfully",
    });
  } catch (error) {
    console.error("Error resetting room:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reset room",
    });
  }
});

export default router;
