import { Router, Request, Response } from "express";
import { PlayerController } from "../controllers/playerController";
import {
  validateCreatePlayer,
  validatePlayerId,
  validateUpdatePlayer,
} from "../middleware/validation";

const router = Router();
const playerController = new PlayerController();

// GET /api/players - List all players
router.get("/", (req: Request, res: Response) =>
  playerController.getAllPlayers(req, res)
);

// GET /api/players/:playerId - Get player by ID
router.get("/:playerId", validatePlayerId, (req: Request, res: Response) =>
  playerController.getPlayerById(req, res)
);

// POST /api/players - Create new player
router.post("/", validateCreatePlayer, (req: Request, res: Response) =>
  playerController.createPlayer(req, res)
);

// PUT /api/players/:playerId - Update player
router.put(
  "/:playerId",
  validatePlayerId,
  validateUpdatePlayer,
  (req: Request, res: Response) => playerController.updatePlayer(req, res)
);

// DELETE /api/players/:playerId - Delete player
router.delete("/:playerId", validatePlayerId, (req: Request, res: Response) =>
  playerController.deletePlayer(req, res)
);

// GET /api/players/:playerId/stats - Get player stats
router.get(
  "/:playerId/stats",
  validatePlayerId,
  (req: Request, res: Response) => playerController.getPlayerStats(req, res)
);

export default router;
