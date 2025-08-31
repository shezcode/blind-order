import { Router } from "express";
import { PlayerController } from "../controllers/playerController";
import {
  validateCreatePlayer,
  validateUpdatePlayer,
  validatePlayerId,
} from "../middleware/validation";

const router = Router();
const playerController = new PlayerController();

// GET /api/players - List all players
router.get("/", (req, res) => playerController.getAllPlayers(req, res));

// GET /api/players/:playerId - Get player by ID
router.get("/:playerId", ...validatePlayerId, (req, res) =>
  playerController.getPlayerById(req, res)
);

// POST /api/players - Create new player
router.post("/", ...validateCreatePlayer, (req, res) =>
  playerController.createPlayer(req, res)
);

// PUT /api/players/:playerId - Update player
router.put(
  "/:playerId",
  ...validatePlayerId,
  ...validateUpdatePlayer,
  (req, res) => playerController.updatePlayer(req, res)
);

// DELETE /api/players/:playerId - Delete player
router.delete("/:playerId", ...validatePlayerId, (req, res) =>
  playerController.deletePlayer(req, res)
);

// GET /api/players/:playerId/stats - Get player stats
router.get("/:playerId/stats", ...validatePlayerId, (req, res) =>
  playerController.getPlayerStats(req, res)
);

export default router;
