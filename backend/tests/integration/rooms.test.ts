import request from "supertest";
import express from "express";
import {
  setupTestDatabase,
  cleanupTestDatabase,
  generateRoomId,
} from "../helpers/setup";
import Database from "better-sqlite3";

describe("Rooms API Integration Tests", () => {
  let app: express.Application;
  let db: Database.Database;

  beforeAll(() => {
    db = setupTestDatabase();

    // Setup Express app
    app = express();
    app.use(express.json());

    // Import and use routes
    const roomRoutes = require("../../src/routes/rooms").default;
    app.use("/api/rooms", roomRoutes);
  });

  afterAll(() => {
    db.close();
    cleanupTestDatabase();
  });

  beforeEach(() => {
    // Clear all data before each test
    db.exec("DELETE FROM players");
    db.exec("DELETE FROM rooms");
  });

  describe("GET /api/rooms", () => {
    it("should return empty array when no rooms exist", async () => {
      const response = await request(app).get("/api/rooms").expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [],
        total: 0,
      });
    });

    it("should return all rooms with player counts", async () => {
      // Insert test rooms
      const stmt = db.prepare(`
        INSERT INTO rooms (id, max_lives, numbers_per_player, lives, state, host_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run("ROOM01", 3, 6, 3, "lobby", "");
      stmt.run("ROOM02", 5, 8, 5, "playing", "player1");

      // Insert test players
      const playerStmt = db.prepare(`
        INSERT INTO players (id, room_id, username, numbers)
        VALUES (?, ?, ?, ?)
      `);

      playerStmt.run("player1", "ROOM01", "Alice", "[]");
      playerStmt.run("player2", "ROOM01", "Bob", "[]");
      playerStmt.run("player3", "ROOM02", "Charlie", "[1,2,3]");

      const response = await request(app).get("/api/rooms").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.total).toBe(2);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].playerCount).toBe(2);
      expect(response.body.data[1].playerCount).toBe(1);
    });
  });

  describe("GET /api/rooms/:roomId", () => {
    it("should return a specific room by ID", async () => {
      // Insert test room
      db.prepare(
        `
        INSERT INTO rooms (id, max_lives, numbers_per_player, lives, state, host_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      ).run("TEST123", 3, 6, 3, "lobby", "");

      const response = await request(app).get("/api/rooms/TEST123").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe("TEST123");
      expect(response.body.data.maxLives).toBe(3);
      expect(response.body.data.state).toBe("lobby");
    });

    it("should return 404 for non-existent room", async () => {
      const response = await request(app)
        .get("/api/rooms/NOTFOUND")
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: "Room not found",
      });
    });
  });

  describe("POST /api/rooms", () => {
    it("should create a new room successfully", async () => {
      const response = await request(app)
        .post("/api/rooms")
        .send({
          maxLives: 5,
          numbersPerPlayer: 10,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.maxLives).toBe(5);
      expect(response.body.data.numbersPerPlayer).toBe(10);
      expect(response.body.data.state).toBe("lobby");
      expect(response.body.data.id).toBeDefined();

      // Verify in database
      const room = db
        .prepare("SELECT * FROM rooms WHERE id = ?")
        .get(response.body.data.id);
      expect(room).toBeDefined();
    });

    it("should use default values when not provided", async () => {
      const response = await request(app)
        .post("/api/rooms")
        .send({})
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.maxLives).toBe(3);
      expect(response.body.data.numbersPerPlayer).toBe(6);
    });

    it("should fail with invalid data", async () => {
      const response = await request(app)
        .post("/api/rooms")
        .send({
          maxLives: -1,
          numbersPerPlayer: 101,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe("PUT /api/rooms/:roomId", () => {
    it("should update an existing room", async () => {
      // Create a room first
      db.prepare(
        `
        INSERT INTO rooms (id, max_lives, numbers_per_player, lives, state, host_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      ).run("UPDATE01", 3, 6, 3, "lobby", "");

      const response = await request(app)
        .put("/api/rooms/UPDATE01")
        .send({
          maxLives: 5,
          state: "playing",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.maxLives).toBe(5);
      expect(response.body.data.state).toBe("playing");

      // Verify in database
      const room = db
        .prepare("SELECT * FROM rooms WHERE id = ?")
        .get("UPDATE01") as any;
      expect(room.max_lives).toBe(5);
      expect(room.state).toBe("playing");
    });

    it("should return 404 for non-existent room", async () => {
      const response = await request(app)
        .put("/api/rooms/NOTFOUND")
        .send({ maxLives: 5 })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: "Room not found",
      });
    });

    it("should fail with invalid state transition", async () => {
      db.prepare(
        `
        INSERT INTO rooms (id, max_lives, numbers_per_player, lives, state, host_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      ).run("INVALID01", 3, 6, 3, "lobby", "");

      const response = await request(app)
        .put("/api/rooms/INVALID01")
        .send({
          state: "invalid-state",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe("DELETE /api/rooms/:roomId", () => {
    it("should delete an existing room", async () => {
      // Create a room with players
      db.prepare(
        `
        INSERT INTO rooms (id, max_lives, numbers_per_player, lives, state, host_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      ).run("DELETE01", 3, 6, 3, "lobby", "");

      db.prepare(
        `
        INSERT INTO players (id, room_id, username, numbers)
        VALUES (?, ?, ?, ?)
      `
      ).run("player1", "DELETE01", "Alice", "[]");

      const response = await request(app)
        .delete("/api/rooms/DELETE01")
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: "Room deleted successfully",
      });

      // Verify room is deleted
      const room = db
        .prepare("SELECT * FROM rooms WHERE id = ?")
        .get("DELETE01");
      expect(room).toBeUndefined();

      // Verify players are also deleted (cascade)
      const players = db
        .prepare("SELECT * FROM players WHERE room_id = ?")
        .all("DELETE01");
      expect(players).toHaveLength(0);
    });

    it("should return 404 for non-existent room", async () => {
      const response = await request(app)
        .delete("/api/rooms/NOTFOUND")
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: "Room not found",
      });
    });
  });

  describe("POST /api/rooms/:roomId/reset", () => {
    it("should reset a room to lobby state", async () => {
      // Create a room in playing state
      db.prepare(
        `
        INSERT INTO rooms (id, max_lives, numbers_per_player, lives, state, host_id, timeline)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      ).run("RESET01", 3, 6, 1, "playing", "host123", "[1,2,3]");

      const response = await request(app)
        .post("/api/rooms/RESET01/reset")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.state).toBe("lobby");
      expect(response.body.data.lives).toBe(3);
      expect(response.body.data.timeline).toEqual([]);

      // Verify in database
      const room = db
        .prepare("SELECT * FROM rooms WHERE id = ?")
        .get("RESET01") as any;
      expect(room.state).toBe("lobby");
      expect(room.lives).toBe(3);
      expect(JSON.parse(room.timeline)).toEqual([]);
    });

    it("should return 404 for non-existent room", async () => {
      const response = await request(app)
        .post("/api/rooms/NOTFOUND/reset")
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: "Room not found",
      });
    });
  });
});
