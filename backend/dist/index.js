"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Import configuration and utilities
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
// Import routes
const rooms_1 = __importDefault(require("./routes/rooms"));
const players_1 = __importDefault(require("./routes/players"));
const handlers_1 = require("./socket/handlers");
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: { origin: config_1.config.getCorsOrigins() },
});
// Middleware
app.use((0, cors_1.default)({
    origin: config_1.config.getCorsOrigins(),
}));
app.use(express_1.default.json());
// Health check endpoint
app.get("/", (req, res) => {
    res.json({
        message: "BlindOrder API v2.0 running!",
        version: "2.0.0",
        environment: config_1.config.get().nodeEnv,
        timestamp: new Date().toISOString(),
        endpoints: {
            rooms: "/api/rooms",
            players: "/api/players",
            health: "/health",
        },
    });
});
// API Routes (new layer architecture)
app.use("/api/rooms", rooms_1.default);
app.use("/api/players", players_1.default);
// Legacy routes
app.use("/room", rooms_1.default);
app.use("/rooms", rooms_1.default);
(0, handlers_1.setupSocketHandlers)(io);
// Error handling middleware
app.use((err, req, res, next) => {
    logger_1.logger.error("Unhandled error:", {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });
    res.status(500).json({
        success: false,
        error: "Internal server error",
        ...(config_1.config.isDevelopment() && { details: err.message }),
    });
});
// Handle 404
app.use("*", (req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} not found`,
    });
});
// Initialize server
const startServer = async () => {
    try {
        // Ensure logs directory exists
        const logsDir = path_1.default.join(process.cwd(), "logs");
        if (!fs_1.default.existsSync(logsDir)) {
            fs_1.default.mkdirSync(logsDir, { recursive: true });
        }
        const port = config_1.config.getPort();
        server.listen(port, () => {
            logger_1.logger.info(`🚀 BlindOrder API v2.0 started`, {
                port,
                environment: config_1.config.get().nodeEnv,
                databaseType: config_1.config.getDatabase().type,
            });
        });
    }
    catch (error) {
        logger_1.logger.error("Failed to start server:", error);
        process.exit(1);
    }
};
// Graceful shutdown
const shutdown = async () => {
    logger_1.logger.info("Shutting down server...");
    server.close(() => {
        logger_1.logger.info("Server shut down successfully");
        process.exit(0);
    });
    // Force shutdown after 10 seconds
    setTimeout(() => {
        logger_1.logger.error("Forced shutdown");
        process.exit(1);
    }, 10000);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
// Handle unhandled promises
process.on("unhandledRejection", (reason, promise) => {
    logger_1.logger.error("Unhandled Rejection at:", { promise, reason });
});
process.on("uncaughtException", (error) => {
    logger_1.logger.error("Uncaught Exception:", error);
    shutdown();
});
// Start the server
startServer();
