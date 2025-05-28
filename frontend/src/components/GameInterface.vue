<template>
  <div class="space-y-6">
    <!-- Compact Status Bar (top, minimized) -->
    <div class="bg-card/50 border border-border/50 rounded-lg px-4 py-2">
      <div class="flex items-center justify-between text-sm">
        <div class="flex items-center space-x-3">
          <!-- Lives indicator -->
          <div class="flex items-center space-x-1">
            <span class="text-xs text-muted-foreground">Lives:</span>
            <div class="flex space-x-0.5">
              <div
                v-for="i in gameState.maxLives"
                :key="i"
                :class="['w-3 h-3 rounded-full', i <= gameState.lives ? 'bg-red-500' : 'bg-muted']"
              />
            </div>
          </div>
          <!-- Progress -->
          <div class="text-xs text-muted-foreground">{{ gameState.progress }}% complete</div>
        </div>

        <!-- Game state messages (compact) -->
        <div v-if="gameState.state === 'victory'" class="text-green-600 text-sm font-medium">
          🎉 Victory!
        </div>
        <div v-else-if="gameState.state === 'game-over'" class="text-red-600 text-sm font-medium">
          💀 Game Over
        </div>
      </div>
    </div>

    <!-- MAIN: Timeline (prominent, centered) -->
    <div class="bg-card border-2 border-primary/20 rounded-xl p-8 shadow-lg">
      <div class="text-center mb-6">
        <h2 class="text-2xl font-bold text-foreground mb-2">Timeline</h2>
        <p class="text-muted-foreground">{{ gameState.timeline.length }} numbers played</p>
      </div>

      <div v-if="gameState.timeline.length > 0" class="space-y-4">
        <!-- Progress bar -->
        <div class="w-full bg-muted rounded-full h-3">
          <div
            class="bg-primary h-3 rounded-full transition-all duration-500"
            :style="{ width: `${gameState.progress}%` }"
          />
        </div>

        <!-- Timeline numbers -->
        <div class="flex flex-wrap justify-center gap-3 max-h-40 overflow-y-auto">
          <div
            v-for="(number, index) in gameState.timeline"
            :key="index"
            class="inline-flex items-center justify-center w-12 h-12 bg-primary text-primary-foreground font-bold rounded-lg text-lg shadow-sm"
          >
            {{ number }}
          </div>
        </div>
      </div>

      <div v-else class="text-center py-12 text-muted-foreground">
        <div class="text-4xl mb-4">🎯</div>
        <p class="text-lg">Ready to start playing numbers in order</p>
      </div>
    </div>

    <!-- MAIN: Player's Numbers (prominent, bottom) -->
    <div class="bg-card border-2 border-accent/20 rounded-xl p-8 shadow-lg">
      <div class="text-center mb-6">
        <h2 class="text-2xl font-bold text-foreground mb-2">Your Numbers</h2>
        <p class="text-muted-foreground">Click a number to play it</p>
      </div>

      <div
        v-if="currentPlayerNumbers.length > 0"
        class="grid grid-cols-3 sm:grid-cols-6 gap-4 justify-items-center"
      >
        <Button
          v-for="number in currentPlayerNumbers"
          :key="number"
          variant="outline"
          :disabled="gameState.state !== 'playing'"
          @click="playNumber(number)"
          class="h-20 w-20 text-2xl font-bold transition-all hover:scale-105 hover:bg-primary hover:text-primary-foreground border-2"
          :class="{
            'opacity-50 cursor-not-allowed': gameState.state !== 'playing',
            'hover:border-primary': gameState.state === 'playing',
          }"
        >
          {{ number }}
        </Button>
      </div>

      <div v-else class="text-center py-12 text-muted-foreground">
        <div class="text-4xl mb-4">
          <span v-if="gameState.state === 'victory'">🎉</span>
          <span v-else>📝</span>
        </div>
        <p class="text-lg">
          <span v-if="gameState.state === 'victory'">All numbers played!</span>
          <span v-else>No numbers remaining</span>
        </p>
      </div>
    </div>

    <!-- Side panels for secondary info -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Game Events Feed (compact, side) -->
      <div class="bg-card/70 border border-border/50 rounded-lg p-4">
        <h3 class="text-sm font-semibold text-foreground mb-3 flex items-center">
          <span class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
          Recent Events
        </h3>

        <div class="space-y-1 max-h-24 overflow-y-auto">
          <div
            v-for="event in recentEvents"
            :key="event.timestamp"
            :class="['text-xs p-2 rounded', getEventStyling(event.type)]"
          >
            {{ formatEvent(event) }}
          </div>
        </div>

        <div
          v-if="(props.gameState.gameEvents || []).length === 0"
          class="text-center py-3 text-muted-foreground text-xs"
        >
          Game events will appear here
        </div>
      </div>

      <!-- Host Controls (compact, side) -->
      <div
        v-if="isHost && (gameState.state === 'game-over' || gameState.state === 'victory')"
        class="bg-card/70 border border-border/50 rounded-lg p-4"
      >
        <h3 class="text-sm font-semibold text-foreground mb-3 flex items-center">
          <span class="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
          Host Controls
        </h3>
        <Button @click="resetGame" variant="outline" size="sm" class="w-full"> Play Again </Button>
      </div>
    </div>

    <!-- Full-screen victory/game over overlay -->
    <div
      v-if="gameState.state === 'victory' && showOverlay"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click="closeOverlay"
    >
      <div
        class="bg-card border border-border rounded-xl p-8 text-center max-w-md mx-4"
        @click.stop
      >
        <div class="text-6xl mb-4">🎉</div>
        <h3 class="text-2xl font-bold text-foreground mb-2">Victory!</h3>
        <p class="text-muted-foreground mb-6">You successfully completed the sequence!</p>
        <div class="space-y-3">
          <Button v-if="isHost" @click="handleResetGame" class="w-full"> 🔄 Play Again </Button>
          <Button v-else variant="outline" @click="handleGoHome" class="w-full">
            🏠 Go Home
          </Button>
          <Button variant="ghost" @click="closeOverlay" class="w-full text-sm">
            📊 View Results
          </Button>
        </div>
        <p v-if="!isHost" class="text-xs text-muted-foreground mt-3">
          Only the host can start a new game
        </p>
      </div>
    </div>

    <div
      v-if="gameState.state === 'game-over' && showOverlay"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click="closeOverlay"
    >
      <div
        class="bg-card border border-border rounded-xl p-8 text-center max-w-md mx-4"
        @click.stop
      >
        <div class="text-6xl mb-4">💀</div>
        <h3 class="text-2xl font-bold text-foreground mb-2">Game Over</h3>
        <p class="text-muted-foreground mb-6">You ran out of lives!</p>
        <div class="space-y-3">
          <Button v-if="isHost" @click="handleResetGame" class="w-full"> 🔄 Try Again </Button>
          <Button v-else variant="outline" @click="handleGoHome" class="w-full">
            🏠 Go Home
          </Button>
          <Button variant="ghost" @click="closeOverlay" class="w-full text-sm">
            📊 View Results
          </Button>
        </div>
        <p v-if="!isHost" class="text-xs text-muted-foreground mt-3">
          Only the host can restart the game
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { computed, ref, watch } from 'vue';
import type { GameEvent } from '@/stores/room';

interface Props {
  gameState: any;
  currentPlayerNumbers: number[];
  isHost: boolean;
  canPlayNumber: (number: number) => boolean;
  playNumber: (number: number) => void;
  resetGame: () => void;
  goHome: () => void;
}

const props = defineProps<Props>();

const showOverlay = ref(true);

// Reset overlay when game state changes
watch(
  () => props.gameState.state,
  (newState) => {
    if (newState === 'game-over' || newState === 'victory') {
      showOverlay.value = true;
    }
  },
);

const recentEvents = computed(() => {
  return (props.gameState.gameEvents || []).slice(-3).reverse();
});

const closeOverlay = () => {
  showOverlay.value = false;
};

const handleResetGame = () => {
  props.resetGame();
  showOverlay.value = false;
};

const handleGoHome = () => {
  props.goHome();
};

const getEventStyling = (eventType: string) => {
  switch (eventType) {
    case 'move-made':
      return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200';
    case 'move-failed':
      return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200';
    case 'game-started':
      return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200';
    case 'game-ended':
      return 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200';
    case 'game-reset':
      return 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200';
    default:
      return 'bg-muted/20 text-muted-foreground';
  }
};

const formatEvent = (event: GameEvent) => {
  switch (event.type) {
    case 'move-made':
      return `${event.data.playerName} played ${event.data.number}`;
    case 'move-failed':
      return `${event.data.playerName || 'Someone'} played ${event.data.number} - ${event.data.error}`;
    case 'game-started':
      return event.data.message;
    case 'game-ended':
      return event.data.message;
    case 'game-reset':
      return event.data.message;
    default:
      return 'Unknown event';
  }
};
</script>
