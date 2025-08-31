"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePlayerId = exports.validateUpdatePlayer = exports.validateCreatePlayer = exports.validateRoomId = exports.validateUpdateRoom = exports.validateCreateRoom = exports.handleValidationErrors = void 0;
const express_validator_1 = require("express-validator");
// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
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
exports.handleValidationErrors = handleValidationErrors;
// Room validation rules
exports.validateCreateRoom = [
    (0, express_validator_1.body)("maxLives")
        .isInt({ min: 1, max: 10 })
        .withMessage("Max lives must be between 1 and 10"),
    (0, express_validator_1.body)("numbersPerPlayer")
        .isInt({ min: 1, max: 20 })
        .withMessage("Numbers per player must be between 1 and 20"),
    exports.handleValidationErrors,
];
exports.validateUpdateRoom = [
    (0, express_validator_1.body)("maxLives")
        .optional()
        .isInt({ min: 1, max: 10 })
        .withMessage("Max lives must be between 1 and 10"),
    (0, express_validator_1.body)("numbersPerPlayer")
        .optional()
        .isInt({ min: 1, max: 20 })
        .withMessage("Numbers per player must be between 1 and 20"),
    exports.handleValidationErrors,
];
exports.validateRoomId = [
    (0, express_validator_1.param)("roomId")
        .isLength({ min: 1 })
        .withMessage("Room ID is required")
        .matches(/^[A-Z0-9]+$/)
        .withMessage("Room ID must contain only uppercase letters and numbers"),
    exports.handleValidationErrors,
];
// Player validation rules
exports.validateCreatePlayer = [
    (0, express_validator_1.body)("roomId")
        .isLength({ min: 1 })
        .withMessage("Room ID is required")
        .matches(/^[A-Z0-9]+$/)
        .withMessage("Room ID must contain only uppercase letters and numbers"),
    (0, express_validator_1.body)("username")
        .isLength({ min: 1, max: 50 })
        .withMessage("Username must be between 1 and 50 characters")
        .matches(/^[a-zA-Z0-9_\-\s]+$/)
        .withMessage("Username can only contain letters, numbers, spaces, hyphens, and underscores"),
    exports.handleValidationErrors,
];
exports.validateUpdatePlayer = [
    (0, express_validator_1.body)("username")
        .isLength({ min: 1, max: 50 })
        .withMessage("Username must be between 1 and 50 characters")
        .matches(/^[a-zA-Z0-9_\-\s]+$/)
        .withMessage("Username can only contain letters, numbers, spaces, hyphens, and underscores"),
    exports.handleValidationErrors,
];
exports.validatePlayerId = [
    (0, express_validator_1.param)("playerId").isLength({ min: 1 }).withMessage("Player ID is required"),
    exports.handleValidationErrors,
];
