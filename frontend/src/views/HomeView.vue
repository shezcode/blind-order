<template>
  <div class="min-h-screen bg-background flex items-center justify-center p-4">
    <div class="w-full max-w-4xl space-y-8">
      <!-- Header -->
      <div class="text-center space-y-2">
        <h1 class="text-4xl font-bold tracking-tight text-foreground">BlindOrder</h1>
        <p class="text-muted-foreground">Manage game rooms and players, or start playing</p>
      </div>

      <!-- Main Actions Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Management Section -->
        <div class="bg-card border border-border rounded-lg p-6 space-y-6 shadow-sm">
          <div class="text-center space-y-2">
            <h2 class="text-2xl font-semibold text-card-foreground">Management</h2>
            <p class="text-muted-foreground">Manage rooms and players</p>
          </div>

          <div class="space-y-4">
            <router-link to="/rooms" class="block">
              <div class="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                <div class="flex items-center space-x-3">
                  <span class="text-2xl">🏠</span>
                  <div>
                    <h3 class="font-semibold text-foreground">Rooms</h3>
                    <p class="text-sm text-muted-foreground">View and manage all game rooms</p>
                  </div>
                </div>
              </div>
            </router-link>

            <router-link to="/players" class="block">
              <div class="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                <div class="flex items-center space-x-3">
                  <span class="text-2xl">👥</span>
                  <div>
                    <h3 class="font-semibold text-foreground">Players</h3>
                    <p class="text-sm text-muted-foreground">Manage players across all rooms</p>
                  </div>
                </div>
              </div>
            </router-link>
          </div>
        </div>

        <!-- Game Section -->
        <div class="bg-card border border-border rounded-lg p-6 space-y-6 shadow-sm">
          <div class="text-center space-y-2">
            <h2 class="text-2xl font-semibold text-card-foreground">Play Game</h2>
            <p class="text-muted-foreground">Create or join a game room</p>
          </div>

          <div class="space-y-4">
            <router-link to="/create" class="block">
              <Button variant="default" size="lg" class="w-full">
                <span class="mr-2">➕</span>
                Create New Room
              </Button>
            </router-link>

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
            <div class="space-y-3">
              <div class="space-y-2">
                <label for="room-code" class="text-sm font-medium text-foreground">Room Code</label>
                <Input
                  id="room-code"
                  v-model="joinRoomId"
                  placeholder="1234"
                  @input="handleRoomCodeInput"
                />
              </div>

              <div class="space-y-2">
                <label for="player-name" class="text-sm font-medium text-foreground"
                  >Username</label
                >
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
      </div>

      <!-- Stats Section -->
      <div class="bg-card border border-border rounded-lg p-6 shadow-sm" v-if="stats">
        <h3 class="text-lg font-semibold text-foreground mb-4">System Overview</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center p-3 bg-muted/30 rounded-md">
            <div class="text-2xl font-bold text-foreground">{{ stats.totalRooms }}</div>
            <div class="text-sm text-muted-foreground">Total Rooms</div>
          </div>
          <div class="text-center p-3 bg-muted/30 rounded-md">
            <div class="text-2xl font-bold text-foreground">{{ stats.totalPlayers }}</div>
            <div class="text-sm text-muted-foreground">Total Players</div>
          </div>
          <div class="text-center p-3 bg-muted/30 rounded-md">
            <div class="text-2xl font-bold text-foreground">{{ stats.activeRooms }}</div>
            <div class="text-sm text-muted-foreground">Active Games</div>
          </div>
          <div class="text-center p-3 bg-muted/30 rounded-md">
            <div class="text-2xl font-bold text-foreground">{{ stats.lobbyRooms }}</div>
            <div class="text-sm text-muted-foreground">Lobby Rooms</div>
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
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const joinRoomId = ref('');
const playerName = ref('');
const stats = ref<any>(null);

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

const fetchStats = async () => {
  try {
    // Fetch rooms
    const roomsResponse = await fetch('http://localhost:3001/api/rooms');
    const roomsData = await roomsResponse.json();

    // Fetch players
    const playersResponse = await fetch('http://localhost:3001/api/players');
    const playersData = await playersResponse.json();

    if (roomsData.success && playersData.success) {
      const rooms = roomsData.data || [];
      const players = playersData.data || [];

      stats.value = {
        totalRooms: rooms.length,
        totalPlayers: players.length,
        activeRooms: rooms.filter((r: any) => r.state === 'playing').length,
        lobbyRooms: rooms.filter((r: any) => r.state === 'lobby').length,
      };
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
};

onMounted(() => {
  fetchStats();
});
</script>
