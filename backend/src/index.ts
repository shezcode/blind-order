import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import fs from "fs";

import * as database from "../config/database";

// Import configuration and utilities
import { config } from "../config/index";
import { logger } from "./utils/logger";

import roomRoutes from "./routes/rooms";
import playerRoutes from "./routes/players";

import { setupSocketHandlers } from "./socket/handlers";

export const app = express();
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

// 404 handler for undefined routes
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.path} not found`,
  });
});

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

// Initialize server - only run if this file is executed directly
const startServer = async () => {
  try {
    const logsDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const port = config.getPort();

    await database.database.initialize();

    server.listen(port, () => {
      logger.info(`🚀 BlindOrder API v2.0 started`, {
        port,
        environment: config.get().nodeEnv,
        databaseType: config.getDatabase().type,
      });

      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Only start the server if this module is run directly (not imported for tests)
if (require.main === module) {
  startServer();
}

// Export for testing
export { server, io };
