import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import fs from "fs";

// Import configuration and utilities
import { config } from "./config";
import { logger } from "./utils/logger";

// Import routes
import roomRoutes from "./routes/rooms";
import playerRoutes from "./routes/players";

import { setupSocketHandlers } from "./socket/handlers";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: config.getCorsOrigins() },
});

// Middleware
app.use(
  cors({
    origin: config.getCorsOrigins(),
  })
);
app.use(express.json());

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "BlindOrder API v2.0 running!",
    version: "2.0.0",
    environment: config.get().nodeEnv,
    timestamp: new Date().toISOString(),
    endpoints: {
      rooms: "/api/rooms",
      players: "/api/players",
      health: "/health",
    },
  });
});

// API Routes (new layer architecture)
app.use("/api/rooms", roomRoutes);
app.use("/api/players", playerRoutes);

// Legacy routes
app.use("/room", roomRoutes);
app.use("/rooms", roomRoutes);

setupSocketHandlers(io);

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error("Unhandled error:", {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });

    res.status(500).json({
      success: false,
      error: "Internal server error",
      ...(config.isDevelopment() && { details: err.message }),
    });
  }
);

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
    const logsDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const port = config.getPort();

    server.listen(port, () => {
      logger.info(`🚀 BlindOrder API v2.0 started`, {
        port,
        environment: config.get().nodeEnv,
        databaseType: config.getDatabase().type,
      });
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  logger.info("Shutting down server...");

  server.close(() => {
    logger.info("Server shut down successfully");
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error("Forced shutdown");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Handle unhandled promises
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", { promise, reason });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  shutdown();
});

// Start the server
startServer();
