// src/middleware/validation.ts
import { body, param, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

// Middleware to handle validation errors
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
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

// Individual validation functions for cleaner usage
export const validateRoomIdParam = param("roomId")
  .isLength({ min: 1, max: 50 })
  .withMessage("Room ID is required and must be less than 50 characters")
  .matches(/^[a-zA-Z0-9_-]+$/)
  .withMessage(
    "Room ID can only contain letters, numbers, underscores, and hyphens"
  );

export const validateMaxLives = body("maxLives")
  .isInt({ min: 1, max: 10 })
  .withMessage("Max lives must be between 1 and 10");

export const validateNumbersPerPlayer = body("numbersPerPlayer")
  .isInt({ min: 1, max: 20 })
  .withMessage("Numbers per player must be between 1 and 20");

export const validateMaxLivesOptional = body("maxLives")
  .optional()
  .isInt({ min: 1, max: 10 })
  .withMessage("Max lives must be between 1 and 10");

export const validateNumbersPerPlayerOptional = body("numbersPerPlayer")
  .optional()
  .isInt({ min: 1, max: 20 })
  .withMessage("Numbers per player must be between 1 and 20");

export const validatePlayerIdParam = param("playerId")
  .isLength({ min: 1, max: 100 })
  .withMessage("Player ID is required and must be less than 100 characters");

export const validateRoomIdBody = body("roomId")
  .isLength({ min: 1, max: 50 })
  .withMessage("Room ID is required and must be less than 50 characters")
  .matches(/^[a-zA-Z0-9_-]+$/)
  .withMessage(
    "Room ID can only contain letters, numbers, underscores, and hyphens"
  );

export const validateUsername = body("username")
  .isLength({ min: 1, max: 50 })
  .withMessage("Username must be between 1 and 50 characters")
  .matches(/^[a-zA-Z0-9_\-\s]+$/)
  .withMessage(
    "Username can only contain letters, numbers, spaces, hyphens, and underscores"
  );

// Composed middleware arrays (keeping backward compatibility)
export const validateCreateRoom = [
  validateMaxLives,
  validateNumbersPerPlayer,
  handleValidationErrors,
];
export const validateUpdateRoom = [
  validateMaxLivesOptional,
  validateNumbersPerPlayerOptional,
  handleValidationErrors,
];
export const validateRoomId = [validateRoomIdParam, handleValidationErrors];
export const validateCreatePlayer = [
  validateRoomIdBody,
  validateUsername,
  handleValidationErrors,
];
export const validateUpdatePlayer = [validateUsername, handleValidationErrors];
export const validatePlayerId = [validatePlayerIdParam, handleValidationErrors];
