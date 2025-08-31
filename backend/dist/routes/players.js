"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const playerController_1 = require("../controllers/playerController");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
const playerController = new playerController_1.PlayerController();
// GET /api/players - List all players
router.get("/", (req, res) => playerController.getAllPlayers(req, res));
// GET /api/players/:playerId - Get player by ID
router.get("/:playerId", validation_1.validatePlayerId, (req, res) => playerController.getPlayerById(req, res));
// POST /api/players - Create new player
router.post("/", validation_1.validateCreatePlayer, (req, res) => playerController.createPlayer(req, res));
// PUT /api/players/:playerId - Update player
router.put("/:playerId", validation_1.validatePlayerId, validation_1.validateUpdatePlayer, (req, res) => playerController.updatePlayer(req, res));
// DELETE /api/players/:playerId - Delete player
router.delete("/:playerId", validation_1.validatePlayerId, (req, res) => playerController.deletePlayer(req, res));
// GET /api/players/:playerId/stats - Get player stats
router.get("/:playerId/stats", validation_1.validatePlayerId, (req, res) => playerController.getPlayerStats(req, res));
exports.default = router;
