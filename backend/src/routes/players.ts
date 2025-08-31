import { Router } from "express";
import {
  validateCreatePlayer,
  validatePlayerId,
} from "../middleware/validation";

import { PlayerController } from "../controller/playerController";

const router = Router();

router.get("/", PlayerController.getAllPlayers);

router.get("/:playerId", validatePlayerId, PlayerController.getPlayerById);

router.post("/", validateCreatePlayer, PlayerController.createPlayer);

router.put("/:playerId", validatePlayerId, PlayerController.updatePlayer);

router.delete("/:playerId", validatePlayerId, PlayerController.deletePlayer);

router.get(
  "/:playerId/stats",
  validatePlayerId,
  PlayerController.getPlayerStats
);

export default router;
