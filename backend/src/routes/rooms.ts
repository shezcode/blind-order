import { Router } from "express";
import {
  validateCreateRoom,
  validateUpdateRoom,
  validateRoomId,
} from "../middleware/validation";
import { RoomController } from "../controller/roomController"; // Import the new controller

const router = Router();

// The generateRoomCode function is now part of the controller (or a utility function if reused elsewhere)
// and thus removed from the routes file.

router.get("/", RoomController.getAllRooms);

router.get("/:roomId", validateRoomId, RoomController.getRoomById);

router.post("/", validateCreateRoom, RoomController.createRoom);

// validateUpdateRoom middleware should be applied here, if it performs checks on the request body
router.put(
  "/:roomId",
  validateRoomId,
  validateUpdateRoom,
  RoomController.updateRoom
);

router.delete("/:roomId", validateRoomId, RoomController.deleteRoom);

router.get("/:roomId/players", validateRoomId, RoomController.getRoomPlayers);

router.post("/:roomId/reset", validateRoomId, RoomController.resetRoom);

export default router;
