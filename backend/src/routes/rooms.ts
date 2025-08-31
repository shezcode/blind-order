import { Router } from "express";
import {
  validateCreateRoom,
  validateUpdateRoom,
  validateRoomId,
} from "../middleware/validation";
import { RoomController } from "../controller/roomController"; // Import the new controller

const router = Router();

router.get("/", RoomController.getAllRooms);

router.get("/:roomId", validateRoomId, RoomController.getRoomById);

router.post("/", validateCreateRoom, RoomController.createRoom);

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
