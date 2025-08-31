import type { Player } from '@/lib/types';

import { defineStore } from 'pinia';
import { io, type Socket } from 'socket.io-client';

import { ref } from 'vue';

export interface GameState {
  state: 'lobby' | 'playing' | 'game-over' | 'victory';
  lives: number;
  maxLives: number;
  timeline: number[];
  progress: number;
  remainingNumbers: number[];
  gameEvents: GameEvent[];
}

export interface GameMove {
  playerId: string;
  playerName: string;
  number: number;
  timeline: number[];
}

export interface GameEvent {
  type: 'move-made' | 'move-failed' | 'game-started' | 'game-ended' | 'game-reset';
  data:
    | { playerId: string; playerName: string; number: number; timeline: number[] } // move-made
    | { error: string } // move-failed
    | object; // game-started, game-ended, game-reset (if no extra data)
  timestamp: number;
}

export const useRoomStore = defineStore('room', () => {
  const socket: Socket = io('http://localhost:3001');

  const connected = ref(false);
  const currentRoomId = ref('');
  const currentPlayerName = ref('');
  const players = ref<Player[]>([]);
  const isHost = ref(false);
  const hostId = ref('');

  const roomSettings = ref({
    lives: 3,
    maxLives: 3,
    numbersPerPlayer: 6,
  });

  // Game state
  const gameState = ref<GameState>({
    state: 'lobby',
    lives: 3,
    maxLives: 3,
    timeline: [],
    progress: 0,
    remainingNumbers: [],
    gameEvents: [],
  });

  const currentPlayerNumbers = ref<number[]>([]);

  const persistGameSession = () => {
    if (currentRoomId.value && currentPlayerName.value) {
      sessionStorage.setItem(
        'gameSession',
        JSON.stringify({
          roomId: currentRoomId.value,
          playerName: currentPlayerName.value,
          isHost: isHost.value,
        }),
      );
    }
  };

  const checkForExistingSession = () => {
    const session = sessionStorage.getItem('gameSession');
    if (session) {
      try {
        const { roomId, playerName, isHost: wasHost } = JSON.parse(session);
        if (roomId && playerName) {
          console.log(`Reconnecting to room ${roomId} as ${playerName}`);
          // Set local state first
          currentRoomId.value = roomId;
          currentPlayerName.value = playerName;
          // Rejoin the room
          socket.emit('join-room', {
            roomId,
            playerName,
            isHost: wasHost,
          });
        }
      } catch (error) {
        console.error('Failed to parse game session:', error);
        sessionStorage.removeItem('gameSession');
      }
    }
  };

  const initializeSocket = () => {
    socket.on('connect', () => {
      connected.value = true;
      checkForExistingSession();
    });

    socket.on('room-updated', (room) => {
      console.log('Frontend received room-updated: ', {
        playersCount: room.players?.length,
        players: room.players?.map((p: Player) => ({ id: p.id, username: p.username })),
      });

      players.value = room.players || [];
      hostId.value = room.hostId;
      isHost.value = room.hostId === socket.id;
      roomSettings.value.lives = room.lives;
      roomSettings.value.maxLives = room.maxLives;
      roomSettings.value.numbersPerPlayer = room.numbersPerPlayer || 6;

      // Update current player's numbers
      const currentPlayer = room.players?.find((p: Player) => p.id === socket.id);
      if (currentPlayer) {
        currentPlayerNumbers.value = currentPlayer.numbers || [];
      }

      persistGameSession();
    });

    socket.on('game-state-updated', (newGameState: GameState) => {
      gameState.value = { ...newGameState };
    });

    socket.on('room-deleted', (data: { reason: string }) => {
      console.log('Room deleted: ', data.reason);
      // Clear session when room is deleted
      sessionStorage.removeItem('gameSession');
      resetRoomState();
      roomDeletedCallback.value?.(data.reason);
    });

    socket.on('left-room', () => {
      console.log('Successfully left room');
      sessionStorage.removeItem('gameSession');
      leaveCallback.value?.();
    });

    socket.on('error', (message) => {
      console.error('Socket error: ', message);
      errorCallback.value?.(message);
      addGameEvent({
        type: 'move-failed',
        data: { error: message },
        timestamp: Date.now(),
      });
    });
  };

  const roomDeletedCallback = ref<((reason: string) => void) | null>(null);
  const errorCallback = ref<((error: string) => void) | null>(null);
  const leaveCallback = ref<(() => void) | null>(null);

  const addGameEvent = (event: GameEvent) => {
    gameState.value.gameEvents.push(event);
    // Keep only last 50 events to prevent memory issues
    if (gameState.value.gameEvents.length > 50) {
      gameState.value.gameEvents = gameState.value.gameEvents.slice(-50);
    }
  };

  const resetRoomState = () => {
    currentRoomId.value = '';
    currentPlayerName.value = '';
    players.value = [];
    isHost.value = false;
    hostId.value = '';
    currentPlayerNumbers.value = [];
    gameState.value = {
      state: 'lobby',
      lives: 3,
      maxLives: 3,
      timeline: [],
      progress: 0,
      remainingNumbers: [],
      gameEvents: [],
    };
  };

  // Actions
  const joinRoom = (roomId: string, playerName: string, asHost = false) => {
    currentRoomId.value = roomId;
    currentPlayerName.value = playerName;
    socket.emit('join-room', { roomId, playerName, isHost: asHost });
    // Session will be persisted when room-updated is received
  };

  const leaveRoom = () => {
    console.log(`Leaving room ${currentRoomId.value}`);
    if (currentRoomId.value) {
      socket.emit('leave-room', { roomId: currentRoomId.value });
    }
    // Clear session when intentionally leaving
    sessionStorage.removeItem('gameSession');
    resetRoomState();
  };

  const startGame = () => {
    if (isHost.value && currentRoomId.value) {
      socket.emit('start-game', { roomId: currentRoomId.value });
    }
  };

  const playNumber = (number: number) => {
    if (currentRoomId.value && gameState.value.state === 'playing') {
      socket.emit('play-number', { roomId: currentRoomId.value, number });
    }
  };

  const resetGame = () => {
    if (isHost.value && currentRoomId.value) {
      socket.emit('reset-game', { roomId: currentRoomId.value });
    }
  };

  const setRoomDeletedCallback = (callback: (reason: string) => void) => {
    roomDeletedCallback.value = callback;
  };

  const setErrorCallback = (callback: (error: string) => void) => {
    errorCallback.value = callback;
  };

  const setLeaveCallback = (callback: () => void) => {
    leaveCallback.value = callback;
  };

  // Computed helpers
  const canStartGame = () => {
    return isHost.value && players.value.length >= 2 && gameState.value.state === 'lobby';
  };

  const isGameInProgress = () => {
    return gameState.value.state === 'playing';
  };

  const isGameOver = () => {
    return gameState.value.state === 'game-over' || gameState.value.state === 'victory';
  };

  const canPlayNumber = (number: number) => {
    return gameState.value.state === 'playing' && currentPlayerNumbers.value.includes(number);
  };

  return {
    // State
    connected,
    currentRoomId,
    currentPlayerName,
    players,
    roomSettings,
    hostId,
    isHost,
    gameState,
    currentPlayerNumbers,

    // Actions
    initializeSocket,
    joinRoom,
    leaveRoom,
    startGame,
    playNumber,
    resetGame,
    setRoomDeletedCallback,
    setErrorCallback,
    setLeaveCallback,

    // Helpers
    canStartGame,
    isGameInProgress,
    isGameOver,
    canPlayNumber,
  };
});
