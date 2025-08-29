import { body, param, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

// Middleware to handle validation errors
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errors.array().map((err) => ({
        field: err.type === "field" ? err.path : "unknown",
        message: err.msg,
        value: err.type === "field" ? err.value : undefined,
      })),
    });
    return;
  }
  next();
};

// Room validation rules
export const validateCreateRoom = [
  body("maxLives")
    .isInt({ min: 1, max: 10 })
    .withMessage("Max lives must be between 1 and 10"),
  body("numbersPerPlayer")
    .isInt({ min: 1, max: 20 })
    .withMessage("Numbers per player must be between 1 and 20"),
  handleValidationErrors,
];

export const validateUpdateRoom = [
  body("maxLives")
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage("Max lives must be between 1 and 10"),
  body("numbersPerPlayer")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("Numbers per player must be between 1 and 20"),
  handleValidationErrors,
];

export const validateRoomId = [
  param("roomId")
    .isLength({ min: 1 })
    .withMessage("Room ID is required")
    .matches(/^[A-Z0-9]+$/)
    .withMessage("Room ID must contain only uppercase letters and numbers"),
  handleValidationErrors,
];

// Player validation rules
export const validateCreatePlayer = [
  body("roomId")
    .isLength({ min: 1 })
    .withMessage("Room ID is required")
    .matches(/^[A-Z0-9]+$/)
    .withMessage("Room ID must contain only uppercase letters and numbers"),
  body("username")
    .isLength({ min: 1, max: 50 })
    .withMessage("Username must be between 1 and 50 characters")
    .matches(/^[a-zA-Z0-9_\-\s]+$/)
    .withMessage(
      "Username can only contain letters, numbers, spaces, hyphens, and underscores"
    ),
  handleValidationErrors,
];

export const validateUpdatePlayer = [
  body("username")
    .isLength({ min: 1, max: 50 })
    .withMessage("Username must be between 1 and 50 characters")
    .matches(/^[a-zA-Z0-9_\-\s]+$/)
    .withMessage(
      "Username can only contain letters, numbers, spaces, hyphens, and underscores"
    ),
  handleValidationErrors,
];

export const validatePlayerId = [
  param("playerId").isLength({ min: 1 }).withMessage("Player ID is required"),
  handleValidationErrors,
];
