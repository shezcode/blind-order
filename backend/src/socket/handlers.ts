import { Server, Socket } from "socket.io";
import { socketRoomService } from "../services/socketRoomAdapter";
import { Player } from "../lib/types";
import { GameEngine } from "../lib/gameLogic";

const socketToRoom = new Map<string, string>();
const socketToPlayer = new Map<string, { roomId: string; username: string }>();

export const setupSocketHandlers = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log("User connected:", socket.id);

    socket.on(
      "join-room",
      async (data: {
        roomId: string;
        playerName: string;
        isHost?: boolean;
      }) => {
        const { roomId, playerName, isHost = false } = data;
        const room = await socketRoomService.getRoom(roomId);

        if (!room) {
          socket.emit("error", "Room not found");
          return;
        }

        // Check for existing player by username (not socket ID)
        const existingPlayerIndex = room.players.findIndex(
          (p: Player) => p.username === playerName
        );

        if (existingPlayerIndex !== -1) {
          // Player reconnecting - update their socket ID
          console.log(
            `Player ${playerName} reconnecting with new socket ID ${socket.id}`
          );

          room.players[existingPlayerIndex].id = socket.id;
          socket.join(roomId);

          // Update tracking maps
          socketToRoom.set(socket.id, roomId);
          socketToPlayer.set(socket.id, { roomId, username: playerName });

          await socketRoomService.updateRoom(room);
          io.to(roomId).emit("room-updated", room);

          if (room.state !== "lobby") {
            socket.emit("game-state-updated", GameEngine.getGameState(room));
          }
          return;
        }

        // Create new player
        const player: Player = {
          id: socket.id,
          username: playerName,
          numbers: [],
          roomId: roomId,
          joinedAt: Date.now().toString(),
        };

        // Add to room and database
        await socketRoomService.addPlayer(roomId, player);
        room.players.push(player);

        // Set host if needed
        if (isHost || room.hostId === "") {
          room.hostId = socket.id;
          await socketRoomService.setHost(roomId, socket.id);
        }

        socket.join(roomId);

        // Update tracking maps
        socketToRoom.set(socket.id, roomId);
        socketToPlayer.set(socket.id, { roomId, username: playerName });

        console.log(
          `${playerName} joined room ${roomId}. Host: ${
            room.hostId === socket.id
          }`
        );

        await socketRoomService.updateRoom(room);
        io.to(roomId).emit("room-updated", room);
      }
    );

    // Start game handler
    socket.on("start-game", async (data: { roomId: string }) => {
      const { roomId } = data;
      const room = await socketRoomService.getRoom(roomId);

      if (!room) {
        socket.emit("error", "Room not found");
        return;
      }

      // Only host can start game
      if (room.hostId !== socket.id) {
        socket.emit("error", "Only host can start the game");
        return;
      }

      // Need at least 2 players
      if (room.players.length < 2) {
        socket.emit("error", "Need at least 2 players to start");
        return;
      }

      // Check if we have enough unique numbers for all players
      const totalNumbersNeeded = room.players.length * room.numbersPerPlayer;
      const availableNumbers = 100; // 1-100 range

      if (totalNumbersNeeded > availableNumbers) {
        socket.emit(
          "error",
          `Not enough unique numbers available. Need ${totalNumbersNeeded} but only have ${availableNumbers}. Reduce players or numbers per player.`
        );
        return;
      }

      try {
        // Initialize game
        GameEngine.initializeGame(room);

        // Add game started event to server-side events
        GameEngine.addGameEvent(room, {
          type: "game-started",
          data: {
            message:
              "Game started! Work together to play all numbers in ascending order. No communication allowed!",
          },
          timestamp: Date.now(),
        });

        // Update room in database
        socketRoomService.updateRoom(room);

        // Notify all players with updated room state (includes events)
        io.to(roomId).emit("room-updated", room);
        io.to(roomId).emit("game-state-updated", GameEngine.getGameState(room));

        console.log(`Game started in room ${roomId}`);
      } catch (error: any) {
        console.error(`Failed to start game in room ${roomId}:`, error);
        socket.emit("error", `Failed to start game: ${error.message}`);
      }
    });

    // Play number handler
    socket.on(
      "play-number",
      async (data: { roomId: string; number: number }) => {
        const { roomId, number } = data;
        const room = await socketRoomService.getRoom(roomId);

        if (!room) {
          socket.emit("error", "Room not found");
          return;
        }

        const result = GameEngine.makeMove(room, socket.id, number);
        const player = room.players.find((p: Player) => p.id === socket.id);

        if (result.success) {
          // Successful move - add to server events
          GameEngine.addGameEvent(room, {
            type: "move-made",
            data: {
              playerId: socket.id,
              playerName: player?.username,
              number: number,
              timeline: room.timeline,
            },
            timestamp: Date.now(),
          });

          if (result.victory) {
            GameEngine.addGameEvent(room, {
              type: "game-ended",
              data: {
                result: "victory",
                message: "Congratulations! You completed the sequence!",
              },
              timestamp: Date.now(),
            });
          }
        } else {
          // Failed move - add to server events
          GameEngine.addGameEvent(room, {
            type: "move-failed",
            data: {
              playerId: socket.id,
              playerName: player?.username,
              number: number,
              error: result.error,
              livesLost: result.livesLost,
              lives: room.lives,
            },
            timestamp: Date.now(),
          });

          if (result.gameOver) {
            GameEngine.addGameEvent(room, {
              type: "game-ended",
              data: {
                result: "defeat",
                message: "Game Over! You ran out of lives.",
              },
              timestamp: Date.now(),
            });
          }
        }

        // Update room in database
        socketRoomService.updateRoom(room);

        // Update all players with current game state (includes synchronized events)
        io.to(roomId).emit("room-updated", room);
        io.to(roomId).emit("game-state-updated", GameEngine.getGameState(room));
      }
    );

    // Reset game handler
    socket.on("reset-game", async (data: { roomId: string }) => {
      const { roomId } = data;
      const room = await socketRoomService.getRoom(roomId);

      if (!room) {
        socket.emit("error", "Room not found");
        return;
      }

      // Only host can reset
      if (room.hostId !== socket.id) {
        socket.emit("error", "Only host can reset the game");
        return;
      }

      GameEngine.resetGame(room);

      // Add reset event to server-side events
      GameEngine.addGameEvent(room, {
        type: "game-reset",
        data: { message: "Game has been reset" },
        timestamp: Date.now(),
      });

      // Update room in database
      socketRoomService.updateRoom(room);

      io.to(roomId).emit("room-updated", room);
      io.to(roomId).emit("game-state-updated", GameEngine.getGameState(room));

      console.log(`Game reset in room ${roomId}`);
    });

    // Leave room handler
    socket.on("leave-room", (data: { roomId: string }) => {
      console.log(`Player ${socket.id} leaving room ${data.roomId}`);
      socket.leave(data.roomId);
      handlePlayerLeave(socket.id, data.roomId, io);
      // Confirm the leave operation
      socket.emit("left-room");
    });

    // Disconnect handler
    socket.on("disconnect", () => {
      console.log("User disconnected: ", socket.id);

      const playerInfo = socketToPlayer.get(socket.id);
      if (playerInfo) {
        console.log(
          `Player ${playerInfo.username} disconnected from room ${playerInfo.roomId}`
        );
        handlePlayerLeave(socket.id, playerInfo.roomId, io);
      }

      socketToPlayer.delete(socket.id);
      socketToRoom.delete(socket.id);
    });
  });
};

const handlePlayerLeave = async (
  socketId: string,
  roomId: string | undefined,
  io: Server
) => {
  if (!roomId) {
    console.log("No roomId provided for disconnect, skipping");
    return;
  }

  console.log(`Handling player leave: ${socketId} from room ${roomId}`);

  const room = await socketRoomService.getRoom(roomId);
  if (!room) {
    console.log(`Room ${roomId} not found`);
    return;
  }

  const playerIndex = room.players.findIndex((p: Player) => p.id === socketId);
  if (playerIndex === -1) {
    console.log(`Player ${socketId} not found in room ${roomId}`);
    return;
  }

  const player = room.players[playerIndex];
  const isHost = room.hostId === socketId;
  const wasInLobby = room.state === "lobby";

  console.log(
    `Player ${player.username} (${socketId}) leaving room ${roomId}. IsHost: ${isHost}`
  );

  // Remove player from room array AND database
  room.players.splice(playerIndex, 1);
  await socketRoomService.removePlayer(socketId);

  console.log(`Room ${roomId} now has ${room.players.length} players`);

  // Handle empty room
  if (room.players.length === 0) {
    console.log(`Room ${roomId} is empty, deleting`);
    await socketRoomService.deleteRoom(roomId);
    return;
  }

  // Handle host leaving
  if (isHost && room.players.length > 0) {
    room.hostId = room.players[0].id;
    await socketRoomService.setHost(roomId, room.players[0].id);
    console.log(`New host assigned: ${room.players[0].username}`);
  }

  // Update room in database
  await socketRoomService.updateRoom(room);
  io.to(roomId).emit("room-updated", room);

  if (room.state !== "lobby") {
    io.to(roomId).emit("game-state-updated", GameEngine.getGameState(room));
  }
};
