import express from "express";
import cors from "cors";
import roomRoutes from "../../src/routes/rooms";
import playerRoutes from "../../src/routes/players";

export function createTestApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use("/api/rooms", roomRoutes);
  app.use("/api/players", playerRoutes);

  // Error handler
  app.use(
    (
      err: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      console.error("Test app error:", err);
      res.status(err.status || 500).json({
        success: false,
        error: err.message || "Internal server error",
      });
    }
  );

  return app;
}
