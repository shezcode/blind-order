"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const config_1 = require("../config");
const createLogger = () => {
    const logLevel = config_1.config.get().logging.level;
    const nodeEnv = config_1.config.get().nodeEnv;
    const logger = winston_1.default.createLogger({
        level: logLevel,
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
        defaultMeta: { service: "blindorder-backend" },
        transports: [
            new winston_1.default.transports.File({
                filename: "logs/error.log",
                level: "error",
            }),
            new winston_1.default.transports.File({ filename: "logs/combined.log" }),
        ],
    });
    return logger;
};
exports.logger = createLogger();
