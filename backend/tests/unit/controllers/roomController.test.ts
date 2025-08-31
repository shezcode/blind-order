import { Request, Response } from "express";
import { RoomController } from "../../../src/controllers/roomController";
import { Room, Player } from "../../../src/lib/types";
import { mockRoom, mockPlayer } from "../../helpers/setup";

// Mock the services before importing
jest.mock("../../../src/services/roomService");
jest.mock("../../../src/services/playerService");
jest.mock("../../../src/utils/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("RoomController", () => {
  let roomController: RoomController;
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

    roomController = new RoomController();
  });

  describe("getAllRooms", () => {
    it("should return all rooms with player counts", async () => {
      const rooms: Room[] = [
        mockRoom({ id: "ROOM1" }),
        mockRoom({ id: "ROOM2" }),
      ];
      const players: Player[] = [
        mockPlayer(),
        mockPlayer({ id: "player-456" }),
      ];

      const roomService =
        require("../../../src/services/roomService").RoomService;
      roomService.prototype.getAllRooms = jest.fn().mockResolvedValue(rooms);
      roomService.prototype.getRoomPlayers = jest
        .fn()
        .mockResolvedValue(players);

      roomController = new RoomController();

      await roomController.getAllRooms(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(roomService.prototype.getAllRooms).toHaveBeenCalled();
      expect(roomService.prototype.getRoomPlayers).toHaveBeenCalledTimes(2);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: "ROOM1",
            playerCount: 2,
          }),
          expect.objectContaining({
            id: "ROOM2",
            playerCount: 2,
          }),
        ]),
        total: 2,
      });
    });
  });

  describe("getRoomById", () => {
    it("should return a room by id with players", async () => {
      const room: Room = mockRoom({ id: "ROOM123" });
      const players: Player[] = [mockPlayer()];

      mockRequest.params = { roomId: "ROOM123" };

      const roomService =
        require("../../../src/services/roomService").RoomService;
      roomService.prototype.getRoomById = jest.fn().mockResolvedValue(room);
      roomService.prototype.getRoomPlayers = jest
        .fn()
        .mockResolvedValue(players);

      roomController = new RoomController();

      await roomController.getRoomById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(roomService.prototype.getRoomById).toHaveBeenCalledWith("ROOM123");
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: "ROOM123",
          players,
          playerCount: 1,
        }),
      });
    });
  });

  describe("createRoom", () => {
    it("should create a new room", async () => {
      const newRoom: Room = mockRoom({ id: "NEW123" });
      mockRequest.body = {
        maxLives: 5,
        numbersPerPlayer: 8,
      };

      const roomService =
        require("../../../src/services/roomService").RoomService;
      roomService.prototype.createRoom = jest.fn().mockResolvedValue(newRoom);

      roomController = new RoomController();

      await roomController.createRoom(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(roomService.prototype.createRoom).toHaveBeenCalled();
      const callArgs = roomService.prototype.createRoom.mock.calls[0][0];
      expect(callArgs.maxLives).toBe(5);
      expect(callArgs.numbersPerPlayer).toBe(8);
      expect(callArgs.hostId).toBe(""); // Controller adds this

      expect(responseStatus).toHaveBeenCalledWith(201);
      // The actual controller returns a different format
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: {
          roomId: newRoom.id,
          room: newRoom,
        },
        message: "Room created successfully",
      });
    });
  });

  describe("updateRoom", () => {
    it("should update an existing room in lobby state", async () => {
      const room: Room = mockRoom({ id: "ROOM123", state: "lobby" });
      const updatedRoom: Room = mockRoom({
        id: "ROOM123",
        maxLives: 5,
        state: "lobby",
      });
      mockRequest.params = { roomId: "ROOM123" };
      mockRequest.body = { maxLives: 5 };

      const roomService =
        require("../../../src/services/roomService").RoomService;
      roomService.prototype.getRoomById = jest.fn().mockResolvedValue(room);
      roomService.prototype.updateRoom = jest
        .fn()
        .mockResolvedValue(updatedRoom);

      roomController = new RoomController();

      await roomController.updateRoom(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(roomService.prototype.getRoomById).toHaveBeenCalledWith("ROOM123");
      expect(roomService.prototype.updateRoom).toHaveBeenCalledWith("ROOM123", {
        maxLives: 5,
      });
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: updatedRoom,
        message: "Room updated successfully",
      });
    });

    it("should not allow updates if room is not in lobby state", async () => {
      const room: Room = mockRoom({ id: "ROOM123", state: "playing" });
      mockRequest.params = { roomId: "ROOM123" };
      mockRequest.body = { maxLives: 5 };

      const roomService =
        require("../../../src/services/roomService").RoomService;
      roomService.prototype.getRoomById = jest.fn().mockResolvedValue(room);

      roomController = new RoomController();

      await roomController.updateRoom(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(roomService.prototype.getRoomById).toHaveBeenCalledWith("ROOM123");
      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: "Can only update rooms in lobby state",
      });
    });
  });

  describe("deleteRoom", () => {
    it("should delete a room successfully", async () => {
      const room: Room = mockRoom({ id: "ROOM123" });
      mockRequest.params = { roomId: "ROOM123" };

      const roomService =
        require("../../../src/services/roomService").RoomService;
      roomService.prototype.getRoomById = jest.fn().mockResolvedValue(room);
      roomService.prototype.deleteRoom = jest.fn().mockResolvedValue(true);

      roomController = new RoomController();

      await roomController.deleteRoom(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(roomService.prototype.getRoomById).toHaveBeenCalledWith("ROOM123");
      expect(roomService.prototype.deleteRoom).toHaveBeenCalledWith("ROOM123");
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: "Room deleted successfully",
      });
    });
  });

  describe("resetRoom", () => {
    it("should reset a room to lobby state", async () => {
      const room: Room = mockRoom({ id: "ROOM123", state: "playing" });
      const resetRoom: Room = mockRoom({
        id: "ROOM123",
        state: "lobby",
        timeline: [],
      });
      mockRequest.params = { roomId: "ROOM123" };

      const roomService =
        require("../../../src/services/roomService").RoomService;
      roomService.prototype.getRoomById = jest.fn().mockResolvedValue(room);
      roomService.prototype.resetRoom = jest.fn().mockResolvedValue(resetRoom);

      roomController = new RoomController();

      await roomController.resetRoom(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(roomService.prototype.getRoomById).toHaveBeenCalledWith("ROOM123");
      expect(roomService.prototype.resetRoom).toHaveBeenCalledWith("ROOM123");
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: resetRoom,
        message: "Room reset successfully",
      });
    });
  });
});
