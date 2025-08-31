export interface Room {
  id: string;
  maxLives: number;
  numbersPerPlayer: number;
  lives: number;
  state: "lobby" | "playing" | "game-over" | "victory";
  hostId: string;
  timeline: number[];
  gameEvents: GameEvent[];
  createdAt: string;
  updatedAt: string;
  players?: Player[];
}

export interface Player {
  id: string;
  roomId: string;
  username: string;
  numbers: number[];
  joinedAt: string;
}

export interface GameEvent {
  id: string;
  type:
    | "move-made"
    | "move-failed"
    | "game-started"
    | "game-ended"
    | "game-reset";
  data: any;
  timestamp: number;
}

export interface CreateRoomData {
  maxLives: number;
  numbersPerPlayer: number;
  hostId?: string;
}

export interface UpdateRoomData {
  maxLives?: number;
  numbersPerPlayer?: number;
  lives?: number;
  state?: Room["state"];
  hostId?: string;
  timeline?: number[];
  gameEvents?: GameEvent[];
}

export interface CreatePlayerData {
  roomId: string;
  username: string;
  numbers?: number[];
}

export interface UpdatePlayerData {
  username?: string;
  numbers?: number[];
}

// Service interfaces
export interface IRoomService {
  createRoom(data: CreateRoomData): Promise<Room>;
  getRoomById(id: string): Promise<Room | null>;
  updateRoom(id: string, data: UpdateRoomData): Promise<Room | null>;
  deleteRoom(id: string): Promise<boolean>;
  getAllRooms(): Promise<Room[]>;
  getRoomPlayers(roomId: string): Promise<Player[]>;
  resetRoom(roomId: string): Promise<Room | null>;
}

export interface IPlayerService {
  createPlayer(data: CreatePlayerData): Promise<Player>;
  getPlayerById(id: string): Promise<Player | null>;
  updatePlayer(id: string, data: UpdatePlayerData): Promise<Player | null>;
  deletePlayer(id: string): Promise<boolean>;
  getAllPlayers(): Promise<Player[]>;
  getPlayersByRoom(roomId: string): Promise<Player[]>;
  getPlayerStats(playerId: string): Promise<any>;
}
