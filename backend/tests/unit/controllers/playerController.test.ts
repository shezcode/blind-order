import { Request, Response } from "express";
import { PlayerController } from "../../../src/controllers/playerController";
import { Room, Player } from "../../../src/lib/types";
import { mockRoom, mockPlayer } from "../../helpers/setup";

// Mock the services before importing
jest.mock("../../../src/services/playerService");
jest.mock("../../../src/services/roomService");
jest.mock("../../../src/utils/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("PlayerController", () => {
  let playerController: PlayerController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    responseJson = jest.fn();
    responseStatus = jest.fn().mockReturnThis();

    mockResponse = {
      json: responseJson,
      status: responseStatus,
    };

    mockRequest = {
      params: {},
      body: {},
      query: {},
    };

    playerController = new PlayerController();
  });

  describe("getAllPlayers", () => {
    it("should return all players with room info", async () => {
      const players: Player[] = [
        mockPlayer({ id: "p1", roomId: "ROOM1" }),
        mockPlayer({ id: "p2", roomId: "ROOM1" }),
      ];
      const room: Room = mockRoom({ id: "ROOM1", hostId: "p1" });

      const playerService =
        require("../../../src/services/playerService").PlayerService;
      const roomService =
        require("../../../src/services/roomService").RoomService;

      playerService.prototype.getAllPlayers = jest
        .fn()
        .mockResolvedValue(players);
      roomService.prototype.getRoomById = jest.fn().mockResolvedValue(room);

      playerController = new PlayerController();

      await playerController.getAllPlayers(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(playerService.prototype.getAllPlayers).toHaveBeenCalled();
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: "p1",
            isHost: true,
            roomState: "lobby",
          }),
          expect.objectContaining({
            id: "p2",
            isHost: false,
            roomState: "lobby",
          }),
        ]),
        total: 2,
      });
    });
  });

  describe("createPlayer", () => {
    it("should create a new player in a room", async () => {
      const room: Room = mockRoom({ id: "ROOM1", state: "lobby" });
      const newPlayer: Player = mockPlayer({
        id: "new-player",
        roomId: "ROOM1",
        username: "NewPlayer",
      });

      mockRequest.body = {
        roomId: "ROOM1",
        username: "NewPlayer",
      };

      const playerService =
        require("../../../src/services/playerService").PlayerService;
      const roomService =
        require("../../../src/services/roomService").RoomService;

      roomService.prototype.getRoomById = jest.fn().mockResolvedValue(room);
      roomService.prototype.getRoomPlayers = jest.fn().mockResolvedValue([]); // Empty room
      playerService.prototype.createPlayer = jest
        .fn()
        .mockResolvedValue(newPlayer);
      roomService.prototype.updateRoom = jest.fn(); // First player becomes host

      playerController = new PlayerController();

      await playerController.createPlayer(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(roomService.prototype.getRoomById).toHaveBeenCalledWith("ROOM1");
      expect(roomService.prototype.getRoomPlayers).toHaveBeenCalledWith(
        "ROOM1"
      );
      expect(playerService.prototype.createPlayer).toHaveBeenCalledWith({
        roomId: "ROOM1",
        username: "NewPlayer", // Note: It's already trimmed in the test
      });
      expect(roomService.prototype.updateRoom).toHaveBeenCalledWith("ROOM1", {
        hostId: "new-player",
      });
      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: "new-player",
          roomId: "ROOM1",
          isHost: true,
        }),
        message: "Player added to room successfully",
      });
    });

    it("should return 404 if room doesn't exist", async () => {
      mockRequest.body = {
        roomId: "NOTFOUND",
        username: "NewPlayer",
      };

      const roomService =
        require("../../../src/services/roomService").RoomService;
      roomService.prototype.getRoomById = jest.fn().mockResolvedValue(null);

      playerController = new PlayerController();

      await playerController.createPlayer(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: "Room not found",
      });
    });

    it("should return 400 if username already exists in room", async () => {
      const room: Room = mockRoom({ id: "ROOM1", state: "lobby" });
      const existingPlayers: Player[] = [mockPlayer({ username: "NewPlayer" })];

      mockRequest.body = {
        roomId: "ROOM1",
        username: "NewPlayer",
      };

      const roomService =
        require("../../../src/services/roomService").RoomService;
      roomService.prototype.getRoomById = jest.fn().mockResolvedValue(room);
      roomService.prototype.getRoomPlayers = jest
        .fn()
        .mockResolvedValue(existingPlayers);

      playerController = new PlayerController();

      await playerController.createPlayer(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: "Username already exists in this room",
      });
    });
  });

  describe("updatePlayer", () => {
    it("should update player information", async () => {
      const existingPlayer: Player = mockPlayer({ id: "p1", roomId: "ROOM1" });
      const room: Room = mockRoom({ id: "ROOM1", state: "lobby" });
      const updatedPlayer: Player = mockPlayer({
        id: "p1",
        username: "UpdatedName",
        numbers: [1, 2, 3],
      });

      mockRequest.params = { playerId: "p1" };
      mockRequest.body = {
        username: "UpdatedName",
        numbers: [1, 2, 3],
      };

      const playerService =
        require("../../../src/services/playerService").PlayerService;
      const roomService =
        require("../../../src/services/roomService").RoomService;

      playerService.prototype.getPlayerById = jest
        .fn()
        .mockResolvedValue(existingPlayer);
      roomService.prototype.getRoomById = jest.fn().mockResolvedValue(room);
      roomService.prototype.getRoomPlayers = jest
        .fn()
        .mockResolvedValue([existingPlayer]);
      playerService.prototype.updatePlayer = jest
        .fn()
        .mockResolvedValue(updatedPlayer);

      playerController = new PlayerController();

      await playerController.updatePlayer(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(playerService.prototype.getPlayerById).toHaveBeenCalledWith("p1");
      expect(playerService.prototype.updatePlayer).toHaveBeenCalledWith("p1", {
        username: "UpdatedName",
        numbers: [1, 2, 3],
      });
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: "p1",
          isHost: false,
        }),
        message: "Player updated successfully",
      });
    });

    it("should return 400 if trying to update during active game", async () => {
      const existingPlayer: Player = mockPlayer({ id: "p1", roomId: "ROOM1" });
      const room: Room = mockRoom({ id: "ROOM1", state: "playing" });

      mockRequest.params = { playerId: "p1" };
      mockRequest.body = { username: "NewName" };

      const playerService =
        require("../../../src/services/playerService").PlayerService;
      const roomService =
        require("../../../src/services/roomService").RoomService;

      playerService.prototype.getPlayerById = jest
        .fn()
        .mockResolvedValue(existingPlayer);
      roomService.prototype.getRoomById = jest.fn().mockResolvedValue(room);

      playerController = new PlayerController();

      await playerController.updatePlayer(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: "Cannot update player during active game",
      });
    });
  });

  describe("deletePlayer", () => {
    it("should delete a player successfully", async () => {
      const player: Player = mockPlayer({ id: "p1", roomId: "ROOM1" });
      const room: Room = mockRoom({ id: "ROOM1", hostId: "p2" });

      mockRequest.params = { playerId: "p1" };

      const playerService =
        require("../../../src/services/playerService").PlayerService;
      const roomService =
        require("../../../src/services/roomService").RoomService;

      playerService.prototype.getPlayerById = jest
        .fn()
        .mockResolvedValue(player);
      roomService.prototype.getRoomById = jest.fn().mockResolvedValue(room);
      playerService.prototype.deletePlayer = jest.fn().mockResolvedValue(true);

      playerController = new PlayerController();

      await playerController.deletePlayer(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(playerService.prototype.deletePlayer).toHaveBeenCalledWith("p1");
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: "Player removed successfully",
      });
    });

    it("should return 404 if player not found", async () => {
      mockRequest.params = { playerId: "NOTFOUND" };

      const playerService =
        require("../../../src/services/playerService").PlayerService;
      playerService.prototype.getPlayerById = jest.fn().mockResolvedValue(null);

      playerController = new PlayerController();

      await playerController.deletePlayer(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: "Player not found",
      });
    });
  });
});
