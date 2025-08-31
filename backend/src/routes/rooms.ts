import { Router, Request, Response } from "express";
import { RoomController } from "../controllers/roomController";
import {
  validateCreateRoom,
  validateUpdateRoom,
  validateRoomId,
} from "../middleware/validation";

const router = Router();
const roomController = new RoomController();

// GET /api/rooms - List all rooms
router.get("/", (req, res) => roomController.getAllRooms(req, res));

// GET /api/rooms/:roomId - Get room by ID
router.get("/:roomId", validateRoomId, (req: Request, res: Response) =>
  roomController.getRoomById(req, res)
);

// POST /api/rooms - Create new room
router.post("/", validateCreateRoom, (req: Request, res: Response) =>
  roomController.createRoom(req, res)
);

// PUT /api/rooms/:roomId - Update room
router.put(
  "/:roomId",
  validateRoomId,
  validateUpdateRoom,
  (req: Request, res: Response) => roomController.updateRoom(req, res)
);

// DELETE /api/rooms/:roomId - Delete room
router.delete("/:roomId", validateRoomId, (req: Request, res: Response) =>
  roomController.deleteRoom(req, res)
);

// GET /api/rooms/:roomId/players - Get room players
router.get("/:roomId/players", validateRoomId, (req: Request, res: Response) =>
  roomController.getRoomPlayers(req, res)
);

// POST /api/rooms/:roomId/reset - Reset room
router.post("/:roomId/reset", validateRoomId, (req: Request, res: Response) =>
  roomController.resetRoom(req, res)
);

export default router;
