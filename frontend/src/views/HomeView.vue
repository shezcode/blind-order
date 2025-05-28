<template>
  <div class="min-h-screen bg-background flex items-center justify-center p-4">
    <div class="w-full max-w-md space-y-8">
      <!-- Header -->
      <div class="text-center space-y-2">
        <h1 class="text-4xl font-bold tracking-tight text-foreground">BlindOrder</h1>
        <p class="text-muted-foreground">Create or join a room to start playing</p>
      </div>

      <!-- Main Actions Card -->
      <div class="bg-card border border-border rounded-lg p-6 space-y-6 shadow-sm">
        <!-- Create Room Section -->
        <div class="space-y-3">
          <h2 class="text-lg font-semibold text-card-foreground">Start a New Game</h2>
          <router-link to="/create" class="block">
            <Button variant="default" size="lg" class="w-full"> Create Room </Button>
          </router-link>
        </div>

        <!-- Divider -->
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <span class="w-full border-t border-border" />
          </div>
          <div class="relative flex justify-center text-xs uppercase">
            <span class="bg-card px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <!-- Join Room Section -->
        <div class="space-y-4">
          <h2 class="text-lg font-semibold text-card-foreground">Join Existing Game</h2>

          <div class="space-y-3">
            <div class="space-y-2">
              <label for="room-code" class="text-sm font-medium text-foreground"> Room Code </label>
              <Input
                id="room-code"
                v-model="joinRoomId"
                placeholder="1234"
                @input="handleRoomCodeInput"
              />
            </div>

            <div class="space-y-2">
              <label for="player-name" class="text-sm font-medium text-foreground">
                Username
              </label>
              <Input id="player-name" v-model="playerName" placeholder="Enter your username" />
            </div>

            <Button
              variant="outline"
              size="lg"
              class="w-full"
              @click="joinRoom"
              :disabled="!canJoin"
            >
              Join Room
            </Button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center text-sm text-muted-foreground">
        Ready to test your coordination skills?
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const joinRoomId = ref('');
const playerName = ref('');

const canJoin = computed(
  () => joinRoomId.value.trim().length > 0 && playerName.value.trim().length > 0,
);

const handleRoomCodeInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  // Convert to uppercase and limit length
  joinRoomId.value = target.value.toUpperCase().slice(0, 6);
};

const joinRoom = () => {
  if (canJoin.value) {
    router.push(
      `/room/${joinRoomId.value.trim()}?name=${encodeURIComponent(playerName.value.trim())}`,
    );
  }
};
</script>
