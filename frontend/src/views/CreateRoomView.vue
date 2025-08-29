<template>
  <div class="min-h-screen bg-background flex items-center justify-center p-4">
    <div class="w-full max-w-md space-y-8">
      <!-- Header -->
      <div class="text-center space-y-2">
        <h1 class="text-3xl font-bold tracking-tight text-foreground">Create New Room</h1>
        <p class="text-muted-foreground">Set up your game preferences</p>
      </div>

      <!-- Form Card -->
      <div class="bg-card border border-border rounded-lg p-6 shadow-sm">
        <form @submit.prevent="createRoom" class="space-y-6">
          <!-- Host Name -->
          <div class="space-y-2">
            <label for="host-name" class="text-sm font-medium text-foreground"> Your Name </label>
            <Input
              id="host-name"
              v-model="hostName"
              placeholder="Enter your name"
              required
              class="w-full"
            />
          </div>

          <!-- Game Settings -->
          <div class="space-y-4">
            <h3 class="text-sm font-medium text-foreground border-b border-border pb-2">
              Game Settings
            </h3>

            <!-- Lives Setting -->
            <div class="space-y-2">
              <label for="max-lives" class="text-sm font-medium text-foreground">
                Number of Lives
              </label>
              <div class="flex items-center space-x-3">
                <Input
                  id="max-lives"
                  v-model.number="maxLives"
                  type="number"
                  min="1"
                  max="5"
                  required
                  class="w-20"
                />
                <span class="text-sm text-muted-foreground"> (1-5 lives per player) </span>
              </div>
            </div>

            <!-- Numbers per Player Setting -->
            <div class="space-y-2">
              <label for="numbers-per-player" class="text-sm font-medium text-foreground">
                Numbers per Player
              </label>
              <div class="flex items-center space-x-3">
                <Input
                  id="numbers-per-player"
                  v-model.number="numbersPerPlayer"
                  type="number"
                  min="4"
                  max="8"
                  required
                  class="w-20"
                />
                <span class="text-sm text-muted-foreground"> (4-8 numbers each) </span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col space-y-3 pt-4">
            <Button
              type="submit"
              size="lg"
              class="w-full"
              :disabled="!hostName.trim() || isLoading"
            >
              <span v-if="isLoading">Creating Room...</span>
              <span v-else>Create Room</span>
            </Button>

            <router-link to="/" class="block">
              <Button type="button" variant="outline" size="lg" class="w-full">
                Back to Home
              </Button>
            </router-link>
          </div>
        </form>
      </div>

      <!-- Game Preview -->
      <div class="bg-muted/30 border border-border rounded-lg p-4">
        <h4 class="text-sm font-medium text-foreground mb-2">Game Preview</h4>
        <div class="text-sm text-muted-foreground space-y-1">
          <p>• Host: {{ hostName || 'Your name' }}</p>
          <p>• Lives: {{ maxLives }} per player</p>
          <p>• Numbers: {{ numbersPerPlayer }} per player</p>
          <p>• Max Players: {{ Math.floor(100 / numbersPerPlayer) }} (with unique numbers)</p>
        </div>

        <!-- Warning for too many numbers -->
        <div
          v-if="numbersPerPlayer > 50"
          class="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded text-yellow-800 dark:text-yellow-200 text-xs"
        >
          ⚠️ High numbers per player may limit room capacity
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const hostName = ref('');
const maxLives = ref(3);
const numbersPerPlayer = ref(6);
const isLoading = ref(false);

const createRoom = async () => {
  if (!hostName.value.trim()) return;

  isLoading.value = true;

  try {
    // Use the new API endpoint
    const response = await fetch('http://localhost:3001/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        maxLives: maxLives.value,
        numbersPerPlayer: numbersPerPlayer.value,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create room');
    }

    const data = await response.json();

    if (data.success) {
      // Navigate to the room with host name (using legacy room route for gameplay)
      router.push(
        `/room/${data.data.roomId}?name=${encodeURIComponent(hostName.value.trim())}&host=true`,
      );
    } else {
      throw new Error(data.error || 'Failed to create room');
    }
  } catch (error) {
    console.error('Error creating room:', error);
    alert(`Failed to create room: ${error}`);
  } finally {
    isLoading.value = false;
  }
};
</script>
