import { RoomService } from "./roomService";
import { PlayerService } from "./playerService";
import { Room, Player, CreateRoomData, CreatePlayerData } from "../lib/types";
import { config } from "../../config";

export class SocketRoomAdapter {
  private roomService: RoomService;
  private playerService: PlayerService;

  private roomsCache = new Map<string, any>();

  constructor() {
    this.roomService = new RoomService();
    this.playerService = new PlayerService();
  }

  // Legacy methods expected by socket handlers
  static initialize() {
    // Already handled in the new services
    console.log("SocketRoomAdapter initialized");
  }

  // Create room and return legacy format
  async createRoom(
    roomId: string,
    maxLives: number,
    numbersPerPlayer: number
  ): Promise<any> {
    const roomData: CreateRoomData = {
      maxLives,
      numbersPerPlayer,
    };

    // Use the new service but with the specific room ID (for socket compatibility)
    const room = await this.roomService.createRoom(roomData);

    // Convert to legacy format expected by sockets
    const legacyRoom = {
      id: roomId, // Use the provided roomId instead of generated one
      players: [],
      timeline: [],
      lives: maxLives,
      maxLives: maxLives,
      numbersPerPlayer: numbersPerPlayer,
      state: "lobby",
      hostId: "",
      gameEvents: [],
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };

    // Cache for socket operations
    this.roomsCache.set(roomId, legacyRoom);

    return legacyRoom;
  }

  // Get room with players populated
  async getRoom(roomId: string): Promise<any | null> {
    // Try cache first
    let room = this.roomsCache.get(roomId);

    if (!room) {
      // Get from database
      const dbRoom = await this.roomService.getRoomById(roomId);
      if (!dbRoom) return null;

      const players = await this.roomService.getRoomPlayers(roomId);

      room = {
        id: dbRoom.id,
        players: players.map((p) => ({
          id: p.id,
          username: p.username,
          numbers: p.numbers,
        })),
        timeline: dbRoom.timeline,
        lives: dbRoom.lives,
        maxLives: dbRoom.maxLives,
        numbersPerPlayer: dbRoom.numbersPerPlayer,
        state: dbRoom.state,
        hostId: dbRoom.hostId,
        gameEvents: dbRoom.gameEvents,
        createdAt: dbRoom.createdAt,
        updatedAt: dbRoom.updatedAt,
      };

      // Cache it
      this.roomsCache.set(roomId, room);
    }

    return room;
  }

  // Add player to room
  async addPlayer(
    roomId: string,
    player: { id: string; username: string }
  ): Promise<void> {
    // Check if player already exists
    const room = await this.getRoom(roomId);
    if (!room) return;

    const existingPlayer = room.players.find(
      (p: Player) => p.username === player.username
    );
    if (existingPlayer) {
      // Update socket ID instead of creating new player
      existingPlayer.id = player.id;
      return;
    }

    // Only create in database OR cache, not both
    const playerData: CreatePlayerData = {
      roomId,
      username: player.username,
    };

    const newPlayer = await this.playerService.createPlayer(playerData);

    // Update cache
    const cachedRoom = this.roomsCache.get(roomId);
    if (cachedRoom) {
      cachedRoom.players.push({
        id: player.id, // Use socket ID, not database ID
        username: newPlayer.username,
        numbers: newPlayer.numbers,
      });
    }
  }

  // Remove player from room
  async removePlayer(playerId: string): Promise<void> {
    await this.playerService.deletePlayer(playerId);

    // Update cache - remove from all rooms
    for (const [roomId, room] of this.roomsCache.entries()) {
      const playerIndex = room.players.findIndex((p: any) => p.id === playerId);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);

        // If it was the host, assign new host
        if (room.hostId === playerId && room.players.length > 0) {
          room.hostId = room.players[0].id;
          await this.roomService.updateRoom(roomId, { hostId: room.hostId });
        }
        break;
      }
    }
  }

  // Update room state (for game mechanics)
  async updateRoom(room: any): Promise<void> {
    await this.roomService.updateRoom(room.id, {
      lives: room.lives,
      state: room.state,
      timeline: room.timeline,
      gameEvents: room.gameEvents,
      hostId: room.hostId,
    });

    // Update cache
    this.roomsCache.set(room.id, { ...room });
  }

  // Set host
  async setHost(roomId: string, playerId: string): Promise<void> {
    await this.roomService.updateRoom(roomId, { hostId: playerId });

    // Update cache
    const room = this.roomsCache.get(roomId);
    if (room) {
      room.hostId = playerId;
    }
  }

  // Delete room
  async deleteRoom(roomId: string): Promise<void> {
    await this.roomService.deleteRoom(roomId);
    this.roomsCache.delete(roomId);
  }

  // Get all rooms (for admin purposes)
  async getAllRooms(): Promise<any[]> {
    const rooms = await this.roomService.getAllRooms();
    return rooms.map((room) => ({
      id: room.id,
      playerCount: 0, // Will be populated if needed
      state: room.state,
      createdAt: room.createdAt,
    }));
  }

  // Generate numbers for player (game logic)
  generateNumbers(count: number, max: number = 100): number[] {
    const numbers: number[] = [];
    while (numbers.length < count) {
      const num = Math.floor(Math.random() * max) + 1;
      if (!numbers.includes(num)) {
        numbers.push(num);
      }
    }
    return numbers.sort((a, b) => a - b);
  }

  // Update player numbers
  async updatePlayerNumbers(
    roomId: string,
    playerId: string,
    numbers: number[]
  ): Promise<void> {
    await this.playerService.updatePlayer(playerId, { numbers });

    // Update cache
    const room = this.roomsCache.get(roomId);
    if (room) {
      const player = room.players.find((p: any) => p.id === playerId);
      if (player) {
        player.numbers = numbers;
      }
    }
  }

  // Clean cache periodically
  clearCache(): void {
    this.roomsCache.clear();
  }
}

// Create singleton instance for socket handlers
export const socketRoomService = new SocketRoomAdapter();
