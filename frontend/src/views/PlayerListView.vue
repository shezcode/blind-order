<template>
  <div class="min-h-screen bg-background p-4">
    <div class="max-w-6xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-foreground">Players</h1>
          <p class="text-muted-foreground">Manage players across all game rooms</p>
        </div>
        <Button @click="showCreateModal = true" size="lg">
          <span class="mr-2">👤</span>
          Add New Player
        </Button>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-card border border-border rounded-lg p-4">
          <div class="flex items-center space-x-2">
            <span class="text-2xl">👥</span>
            <div>
              <div class="text-2xl font-bold text-foreground">{{ players.length }}</div>
              <div class="text-sm text-muted-foreground">Total Players</div>
            </div>
          </div>
        </div>
        <div class="bg-card border border-border rounded-lg p-4">
          <div class="flex items-center space-x-2">
            <span class="text-2xl">👑</span>
            <div>
              <div class="text-2xl font-bold text-foreground">{{ hostsCount }}</div>
              <div class="text-sm text-muted-foreground">Room Hosts</div>
            </div>
          </div>
        </div>
        <div class="bg-card border border-border rounded-lg p-4">
          <div class="flex items-center space-x-2">
            <span class="text-2xl">🎮</span>
            <div>
              <div class="text-2xl font-bold text-foreground">{{ activePlayers }}</div>
              <div class="text-sm text-muted-foreground">In Active Games</div>
            </div>
          </div>
        </div>
        <div class="bg-card border border-border rounded-lg p-4">
          <div class="flex items-center space-x-2">
            <span class="text-2xl">⏳</span>
            <div>
              <div class="text-2xl font-bold text-foreground">{{ lobbyPlayers }}</div>
              <div class="text-sm text-muted-foreground">In Lobby</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters and Search -->
      <div class="bg-card border border-border rounded-lg p-4">
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="flex-1">
            <Input
              v-model="searchTerm"
              placeholder="Search players by username..."
              class="w-full"
            />
          </div>
          <div class="flex gap-2">
            <Button
              v-for="filter in ['all', 'hosts', 'in-game', 'in-lobby']"
              :key="filter"
              :variant="playerFilter === filter ? 'default' : 'outline'"
              @click="playerFilter = filter"
              size="sm"
            >
              {{ filter.replace('-', ' ').toUpperCase() }}
            </Button>
          </div>
        </div>
      </div>

      <!-- Players Table -->
      <div class="bg-card border border-border rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="border-b border-border">
              <tr class="text-left">
                <th class="p-4 font-semibold text-foreground">Player</th>
                <th class="p-4 font-semibold text-foreground">Room</th>
                <th class="p-4 font-semibold text-foreground">Role</th>
                <th class="p-4 font-semibold text-foreground">Numbers</th>
                <th class="p-4 font-semibold text-foreground">Status</th>
                <th class="p-4 font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="player in filteredPlayers"
                :key="player.id"
                class="border-b border-border hover:bg-muted/30 transition-colors"
              >
                <td class="p-4">
                  <div class="flex items-center space-x-3">
                    <div
                      class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center"
                    >
                      <span class="font-semibold text-primary">
                        {{ player.username.charAt(0).toUpperCase() }}
                      </span>
                    </div>
                    <div>
                      <div class="font-semibold text-foreground">{{ player.username }}</div>
                      <div class="text-sm text-muted-foreground font-mono">{{ player.id }}</div>
                    </div>
                  </div>
                </td>
                <td class="p-4">
                  <div class="font-mono text-primary">{{ player.roomId }}</div>
                </td>
                <td class="p-4">
                  <div class="flex items-center space-x-2">
                    <span v-if="player.isHost" class="text-yellow-500">👑</span>
                    <span>{{ player.isHost ? 'Host' : 'Player' }}</span>
                  </div>
                </td>
                <td class="p-4">
                  <div class="text-center">
                    <span class="text-lg font-semibold">{{ player.numbers?.length || 0 }}</span>
                    <span class="text-sm text-muted-foreground ml-1">left</span>
                  </div>
                </td>
                <td class="p-4">
                  <span
                    :class="['px-2 py-1 rounded text-xs font-medium', getPlayerStatusColor(player)]"
                  >
                    {{ getPlayerStatus(player) }}
                  </span>
                </td>
                <td class="p-4">
                  <div class="flex items-center space-x-2">
                    <Button @click="viewPlayer(player)" variant="outline" size="sm">
                      👁️ View
                    </Button>
                    <Button @click="editPlayer(player)" variant="outline" size="sm">
                      ✏️ Edit
                    </Button>
                    <Button @click="deletePlayer(player)" variant="destructive" size="sm">
                      🗑️ Remove
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-if="filteredPlayers.length === 0" class="text-center py-12">
          <div class="text-4xl mb-4">👥</div>
          <h3 class="text-lg font-semibold text-foreground mb-2">No players found</h3>
          <p class="text-muted-foreground mb-4">
            {{
              searchTerm ? 'Try adjusting your search terms' : 'Add players to rooms to get started'
            }}
          </p>
          <Button @click="showCreateModal = true" v-if="!searchTerm && availableRooms.length > 0">
            Add First Player
          </Button>
        </div>
      </div>

      <!-- Create/Edit Modal -->
      <div
        v-if="showCreateModal || editingPlayer"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <div class="bg-card border border-border rounded-lg p-6 w-full max-w-md">
          <h3 class="text-lg font-semibold text-foreground mb-4">
            {{ editingPlayer ? 'Edit Player' : 'Add New Player' }}
          </h3>

          <form @submit.prevent="editingPlayer ? updatePlayer() : createPlayer()" class="space-y-4">
            <div class="space-y-2" v-if="!editingPlayer">
              <label class="text-sm font-medium text-foreground">Room</label>
              <select
                v-model="playerForm.roomId"
                required
                class="w-full p-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="">Select a room</option>
                <option v-for="room in availableRooms" :key="room.id" :value="room.id">
                  {{ room.id }} ({{ room.playerCount || 0 }} players)
                </option>
              </select>
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-foreground">Username</label>
              <Input
                v-model="playerForm.username"
                placeholder="Enter username"
                required
                class="w-full"
              />
            </div>

            <div class="flex justify-end space-x-3">
              <Button @click="closeModal" type="button" variant="outline"> Cancel </Button>
              <Button type="submit" :disabled="isLoading">
                {{ isLoading ? 'Saving...' : editingPlayer ? 'Update' : 'Add' }}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <!-- View Player Modal -->
      <div
        v-if="viewingPlayer"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <div class="bg-card border border-border rounded-lg p-6 w-full max-w-2xl">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-foreground">Player Details</h3>
            <Button @click="viewingPlayer = null" variant="ghost" size="sm">✕</Button>
          </div>

          <div class="space-y-4">
            <div class="flex items-center space-x-4 mb-6">
              <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <span class="text-2xl font-semibold text-primary">
                  {{ viewingPlayer.username.charAt(0).toUpperCase() }}
                </span>
              </div>
              <div>
                <h4 class="text-xl font-semibold text-foreground">{{ viewingPlayer.username }}</h4>
                <div class="text-sm text-muted-foreground font-mono">{{ viewingPlayer.id }}</div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-medium text-muted-foreground">Room</label>
                <div class="font-mono text-primary">{{ viewingPlayer.roomId }}</div>
              </div>
              <div>
                <label class="text-sm font-medium text-muted-foreground">Role</label>
                <div class="flex items-center space-x-2">
                  <span v-if="viewingPlayer.isHost" class="text-yellow-500">👑</span>
                  <span>{{ viewingPlayer.isHost ? 'Room Host' : 'Player' }}</span>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-medium text-muted-foreground">Numbers Remaining</label>
                <div class="text-2xl font-bold text-foreground">
                  {{ viewingPlayer.numbers?.length || 0 }}
                </div>
              </div>
              <div>
                <label class="text-sm font-medium text-muted-foreground">Status</label>
                <span
                  :class="[
                    'inline-block px-2 py-1 rounded text-xs font-medium',
                    getPlayerStatusColor(viewingPlayer),
                  ]"
                >
                  {{ getPlayerStatus(viewingPlayer) }}
                </span>
              </div>
            </div>

            <div v-if="viewingPlayer.numbers?.length > 0">
              <label class="text-sm font-medium text-muted-foreground">Player's Numbers</label>
              <div class="mt-2 flex flex-wrap gap-2">
                <span
                  v-for="number in viewingPlayer.numbers"
                  :key="number"
                  class="inline-block bg-accent text-accent-foreground px-2 py-1 rounded text-sm"
                >
                  {{ number }}
                </span>
              </div>
            </div>

            <div v-if="playerStats">
              <label class="text-sm font-medium text-muted-foreground">Statistics</label>
              <div class="mt-2 grid grid-cols-2 gap-4 text-sm">
                <div>Games Played: {{ playerStats.gamesPlayed }}</div>
                <div>Current Room: {{ playerStats.currentRoom }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Player {
  id: string;
  username: string;
  numbers: number[];
  roomId: string;
  isHost?: boolean;
}

interface Room {
  id: string;
  playerCount: number;
  state: string;
}

const players = ref<Player[]>([]);
const availableRooms = ref<Room[]>([]);
const searchTerm = ref('');
const playerFilter = ref('all');
const isLoading = ref(false);
const showCreateModal = ref(false);
const editingPlayer = ref<Player | null>(null);
const viewingPlayer = ref<Player | null>(null);
interface PlayerStats {
  gamesPlayed: number;
  currentRoom: string;
}

const playerStats = ref<PlayerStats | null>(null);

const playerForm = ref({
  roomId: '',
  username: '',
});

const filteredPlayers = computed(() => {
  let filtered = players.value;

  // Filter by search term
  if (searchTerm.value) {
    filtered = filtered.filter((player) =>
      player.username.toLowerCase().includes(searchTerm.value.toLowerCase()),
    );
  }

  // Filter by type
  switch (playerFilter.value) {
    case 'hosts':
      filtered = filtered.filter((player) => player.isHost);
      break;
    case 'in-game':
      filtered = filtered.filter((player) => {
        const room = availableRooms.value.find((r) => r.id === player.roomId);
        return room?.state === 'playing';
      });
      break;
    case 'in-lobby':
      filtered = filtered.filter((player) => {
        const room = availableRooms.value.find((r) => r.id === player.roomId);
        return room?.state === 'lobby';
      });
      break;
  }

  return filtered;
});

const hostsCount = computed(() => {
  return players.value.filter((player) => player.isHost).length;
});

const activePlayers = computed(() => {
  return players.value.filter((player) => {
    const room = availableRooms.value.find((r) => r.id === player.roomId);
    return room?.state === 'playing';
  }).length;
});

const lobbyPlayers = computed(() => {
  return players.value.filter((player) => {
    const room = availableRooms.value.find((r) => r.id === player.roomId);
    return room?.state === 'lobby';
  }).length;
});

const fetchPlayers = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/players');
    const data = await response.json();

    if (data.success) {
      // Enhance player data with room info
      const enhancedPlayers = await Promise.all(
        data.data.map(async (player: Player) => {
          try {
            const roomResponse = await fetch(`http://localhost:3001/api/rooms/${player.roomId}`);
            const roomData = await roomResponse.json();

            return {
              ...player,
              isHost: roomData.success ? roomData.data.hostId === player.id : false,
            };
          } catch {
            return player;
          }
        }),
      );
      players.value = enhancedPlayers;
    }
  } catch (error) {
    console.error('Error fetching players:', error);
  }
};

const fetchRooms = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/rooms');
    const data = await response.json();

    if (data.success) {
      availableRooms.value = data.data;
    }
  } catch (error) {
    console.error('Error fetching rooms:', error);
  }
};

const createPlayer = async () => {
  isLoading.value = true;
  try {
    const response = await fetch('http://localhost:3001/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playerForm.value),
    });

    const data = await response.json();
    if (data.success) {
      await fetchPlayers();
      await fetchRooms();
      closeModal();
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error('Error creating player:', error);
    alert('Failed to create player');
  } finally {
    isLoading.value = false;
  }
};

const updatePlayer = async () => {
  if (!editingPlayer.value) return;

  isLoading.value = true;
  try {
    const response = await fetch(`http://localhost:3001/api/players/${editingPlayer.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: playerForm.value.username }),
    });

    const data = await response.json();
    if (data.success) {
      await fetchPlayers();
      closeModal();
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error('Error updating player:', error);
    alert('Failed to update player');
  } finally {
    isLoading.value = false;
  }
};

const deletePlayer = async (player: Player) => {
  if (!confirm(`Are you sure you want to remove ${player.username}?`)) return;

  try {
    const response = await fetch(`http://localhost:3001/api/players/${player.id}`, {
      method: 'DELETE',
    });

    const data = await response.json();
    if (data.success) {
      await fetchPlayers();
      await fetchRooms();
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error('Error deleting player:', error);
    alert('Failed to delete player');
  }
};

const viewPlayer = async (player: Player) => {
  viewingPlayer.value = player;

  // Fetch player stats
  try {
    const response = await fetch(`http://localhost:3001/api/players/${player.id}/stats`);
    const data = await response.json();
    if (data.success) {
      playerStats.value = data.data;
    }
  } catch (error) {
    console.error('Error fetching player stats:', error);
  }
};

const editPlayer = (player: Player) => {
  editingPlayer.value = player;
  playerForm.value = {
    roomId: player.roomId,
    username: player.username,
  };
};

const closeModal = () => {
  showCreateModal.value = false;
  editingPlayer.value = null;
  viewingPlayer.value = null;
  playerStats.value = null;
  playerForm.value = {
    roomId: '',
    username: '',
  };
};

const getPlayerStatus = (player: Player) => {
  const room = availableRooms.value.find((r) => r.id === player.roomId);
  return room?.state || 'unknown';
};

const getPlayerStatusColor = (player: Player) => {
  const status = getPlayerStatus(player);
  switch (status) {
    case 'lobby':
      return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200';
    case 'playing':
      return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200';
    case 'game-over':
      return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200';
    case 'victory':
      return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200';
    default:
      return 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200';
  }
};

onMounted(() => {
  fetchPlayers();
  fetchRooms();
});
</script>
