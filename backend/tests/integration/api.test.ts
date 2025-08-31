import request from "supertest";
import { app } from "../../src/index";

describe("BlindOrder API Integration Tests", () => {
  describe("Rooms API", () => {
    describe("GET /api/rooms", () => {
      it("should get all rooms (success case)", async () => {
        const response = await request(app).get("/api/rooms").expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe("POST /api/rooms", () => {
      it("should fail when maxLives is invalid (failure case)", async () => {
        const response = await request(app)
          .post("/api/rooms")
          .send({
            maxLives: 15, // Invalid - max is 10
            numbersPerPlayer: 6,
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe("Validation failed");
      });
    });

    describe("PUT /api/rooms/:roomId", () => {
      it("should fail when updating with invalid data (failure case)", async () => {
        const response = await request(app)
          .put("/api/rooms/ANYROOM")
          .send({
            maxLives: -1, // Invalid
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe("Validation failed");
      });
    });

    describe("DELETE /api/rooms/:roomId", () => {
      it("should fail when room does not exist (failure case)", async () => {
        const response = await request(app)
          .delete("/api/rooms/NONEXISTENT")
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe("Room not found");
      });
    });

    describe("GET /api/rooms/:roomId", () => {
      it("should fail when room does not exist (success case for 404)", async () => {
        const response = await request(app)
          .get("/api/rooms/NONEXISTENT")
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe("Room not found");
      });
    });
  });

  describe("Players API", () => {
    describe("GET /api/players", () => {
      it("should get all players (success case)", async () => {
        const response = await request(app).get("/api/players").expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe("POST /api/players", () => {
      it("should fail when roomId is missing (failure case)", async () => {
        const response = await request(app)
          .post("/api/players")
          .send({
            username: "TestPlayer",
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe("Validation failed");
      });
    });

    describe("PUT /api/players/:playerId", () => {
      it("should fail when updating with invalid username (failure case)", async () => {
        const response = await request(app)
          .put("/api/players/ANYPLAYER")
          .send({
            username: "", // Invalid - empty username
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe("Validation failed");
      });
    });

    describe("DELETE /api/players/:playerId", () => {
      it("should fail when player does not exist (failure case)", async () => {
        const response = await request(app)
          .delete("/api/players/nonexistent-id")
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe("Player not found");
      });
    });

    describe("GET /api/players/:playerId", () => {
      it("should fail when player does not exist (success case for 404)", async () => {
        const response = await request(app)
          .get("/api/players/nonexistent-id")
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe("Player not found");
      });
    });
  });

  describe("Health Check", () => {
    describe("GET /", () => {
      it("should return API health status (success case)", async () => {
        const response = await request(app).get("/").expect(200);

        expect(response.body.message).toBeDefined();
        expect(response.body.version).toBeDefined();
        expect(response.body.endpoints).toBeDefined();
      });
    });
  });
});
