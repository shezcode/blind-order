"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const roomController_1 = require("../controllers/roomController");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
const roomController = new roomController_1.RoomController();
// GET /api/rooms - List all rooms
router.get("/", (req, res) => roomController.getAllRooms(req, res));
// GET /api/rooms/:roomId - Get room by ID
router.get("/:roomId", validation_1.validateRoomId, (req, res) => roomController.getRoomById(req, res));
// POST /api/rooms - Create new room
router.post("/", validation_1.validateCreateRoom, (req, res) => roomController.createRoom(req, res));
// PUT /api/rooms/:roomId - Update room
router.put("/:roomId", validation_1.validateRoomId, validation_1.validateUpdateRoom, (req, res) => roomController.updateRoom(req, res));
// DELETE /api/rooms/:roomId - Delete room
router.delete("/:roomId", validation_1.validateRoomId, (req, res) => roomController.deleteRoom(req, res));
// GET /api/rooms/:roomId/players - Get room players
router.get("/:roomId/players", validation_1.validateRoomId, (req, res) => roomController.getRoomPlayers(req, res));
// POST /api/rooms/:roomId/reset - Reset room
router.post("/:roomId/reset", validation_1.validateRoomId, (req, res) => roomController.resetRoom(req, res));
exports.default = router;
