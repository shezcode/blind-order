<template>
  <div class="min-h-screen bg-background p-4">
    <div class="max-w-6xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-foreground">Game Rooms</h1>
          <p class="text-muted-foreground">Manage game rooms and their settings</p>
        </div>
        <Button @click="showCreateModal = true" size="lg">
          <span class="mr-2">➕</span>
          Create New Room
        </Button>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-card border border-border rounded-lg p-4">
          <div class="flex items-center space-x-2">
            <span class="text-2xl">🏠</span>
            <div>
              <div class="text-2xl font-bold text-foreground">{{ rooms.length }}</div>
              <div class="text-sm text-muted-foreground">Total Rooms</div>
            </div>
          </div>
        </div>
        <div class="bg-card border border-border rounded-lg p-4">
          <div class="flex items-center space-x-2">
            <span class="text-2xl">👥</span>
            <div>
              <div class="text-2xl font-bold text-foreground">{{ totalPlayers }}</div>
              <div class="text-sm text-muted-foreground">Active Players</div>
            </div>
          </div>
        </div>
        <div class="bg-card border border-border rounded-lg p-4">
          <div class="flex items-center space-x-2">
            <span class="text-2xl">🎮</span>
            <div>
              <div class="text-2xl font-bold text-foreground">{{ activeRooms }}</div>
              <div class="text-sm text-muted-foreground">Active Games</div>
            </div>
          </div>
        </div>
        <div class="bg-card border border-border rounded-lg p-4">
          <div class="flex items-center space-x-2">
            <span class="text-2xl">⏳</span>
            <div>
              <div class="text-2xl font-bold text-foreground">{{ lobbyRooms }}</div>
              <div class="text-sm text-muted-foreground">Lobby Rooms</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters and Search -->
      <div class="bg-card border border-border rounded-lg p-4">
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="flex-1">
            <Input v-model="searchTerm" placeholder="Search rooms by ID..." class="w-full" />
          </div>
          <div class="flex gap-2">
            <Button
              v-for="status in ['all', 'lobby', 'playing', 'game-over', 'victory']"
              :key="status"
              :variant="filterStatus === status ? 'default' : 'outline'"
              @click="filterStatus = status"
              size="sm"
            >
              {{ status === 'all' ? 'All' : status.replace('-', ' ').toUpperCase() }}
            </Button>
          </div>
        </div>
      </div>

      <!-- Rooms Table -->
      <div class="bg-card border border-border rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="border-b border-border">
              <tr class="text-left">
                <th class="p-4 font-semibold text-foreground">Room ID</th>
                <th class="p-4 font-semibold text-foreground">Players</th>
                <th class="p-4 font-semibold text-foreground">Status</th>
                <th class="p-4 font-semibold text-foreground">Settings</th>
                <th class="p-4 font-semibold text-foreground">Host</th>
                <th class="p-4 font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="room in filteredRooms"
                :key="room.id"
                class="border-b border-border hover:bg-muted/30 transition-colors"
              >
                <td class="p-4">
                  <div class="font-mono font-semibold text-primary">{{ room.id }}</div>
                  <div class="text-xs text-muted-foreground">
                    Created: {{ formatDate(room.createdAt) }}
                  </div>
                </td>
                <td class="p-4">
                  <div class="flex items-center space-x-2">
                    <span class="text-lg font-semibold">{{ room.playerCount || 0 }}</span>
                    <span class="text-muted-foreground">players</span>
                  </div>
                </td>
                <td class="p-4">
                  <span
                    :class="[
                      'px-2 py-1 rounded-md text-xs font-medium',
                      getStatusColor(room.state),
                    ]"
                  >
                    {{ room.state }}
                  </span>
                </td>
                <td class="p-4">
                  <div class="text-sm space-y-1">
                    <div>Lives: {{ room.maxLives }}</div>
                    <div>Numbers: {{ room.numbersPerPlayer }}</div>
                  </div>
                </td>
                <td class="p-4">
                  <div class="text-sm">
                    {{ getHostName(room) || 'No host' }}
                  </div>
                </td>
                <td class="p-4">
                  <div class="flex items-center space-x-2">
                    <Button @click="viewRoom(room)" variant="outline" size="sm"> 👁️ View </Button>
                    <Button
                      @click="editRoom(room)"
                      variant="outline"
                      size="sm"
                      :disabled="room.state !== 'lobby'"
                    >
                      ✏️ Edit
                    </Button>
                    <Button @click="deleteRoom(room)" variant="destructive" size="sm">
                      🗑️ Delete
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-if="filteredRooms.length === 0" class="text-center py-12">
          <div class="text-4xl mb-4">🏠</div>
          <h3 class="text-lg font-semibold text-foreground mb-2">No rooms found</h3>
          <p class="text-muted-foreground mb-4">
            {{
              searchTerm
                ? 'Try adjusting your search terms'
                : 'Create your first room to get started'
            }}
          </p>
          <Button @click="showCreateModal = true" v-if="!searchTerm"> Create First Room </Button>
        </div>
      </div>

      <!-- Create/Edit Modal -->
      <div
        v-if="showCreateModal || editingRoom"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <div class="bg-card border border-border rounded-lg p-6 w-full max-w-md">
          <h3 class="text-lg font-semibold text-foreground mb-4">
            {{ editingRoom ? 'Edit Room' : 'Create New Room' }}
          </h3>

          <form @submit.prevent="editingRoom ? updateRoom() : createRoom()" class="space-y-4">
            <div class="space-y-2">
              <label class="text-sm font-medium text-foreground">Max Lives</label>
              <Input
                v-model.number="roomForm.maxLives"
                type="number"
                min="1"
                max="10"
                required
                class="w-full"
              />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-foreground">Numbers per Player</label>
              <Input
                v-model.number="roomForm.numbersPerPlayer"
                type="number"
                min="1"
                max="20"
                required
                class="w-full"
              />
            </div>

            <div class="flex justify-end space-x-3">
              <Button @click="closeModal" type="button" variant="outline"> Cancel </Button>
              <Button type="submit" :disabled="isLoading">
                {{ isLoading ? 'Saving...' : editingRoom ? 'Update' : 'Create' }}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <!-- View Room Modal -->
      <div
        v-if="viewingRoom"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <div
          class="bg-card border border-border rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
        >
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-foreground">Room Details</h3>
            <Button @click="viewingRoom = null" variant="ghost" size="sm">✕</Button>
          </div>

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-medium text-muted-foreground">Room ID</label>
                <div class="font-mono text-primary">{{ viewingRoom.id }}</div>
              </div>
              <div>
                <label class="text-sm font-medium text-muted-foreground">Status</label>
                <span
                  :class="[
                    'inline-block px-2 py-1 rounded text-xs font-medium',
                    getStatusColor(viewingRoom.state),
                  ]"
                >
                  {{ viewingRoom.state }}
                </span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-medium text-muted-foreground">Max Lives</label>
                <div>{{ viewingRoom.maxLives }}</div>
              </div>
              <div>
                <label class="text-sm font-medium text-muted-foreground">Numbers per Player</label>
                <div>{{ viewingRoom.numbersPerPlayer }}</div>
              </div>
            </div>

            <div>
              <label class="text-sm font-medium text-muted-foreground"
                >Players ({{ viewingRoom.players?.length || 0 }})</label
              >
              <div class="mt-2 space-y-2">
                <div
                  v-for="player in viewingRoom.players || []"
                  :key="player.id"
                  class="flex items-center justify-between p-2 bg-muted/20 rounded"
                >
                  <span>{{ player.username }}</span>
                  <div class="flex items-center space-x-2">
                    <span v-if="player.id === viewingRoom.hostId" class="text-yellow-500">👑</span>
                    <span class="text-xs text-muted-foreground"
                      >{{ player.numbers?.length || 0 }} numbers</span
                    >
                  </div>
                </div>
              </div>
            </div>

            <div v-if="viewingRoom.timeline?.length > 0">
              <label class="text-sm font-medium text-muted-foreground">Timeline</label>
              <div class="mt-2 flex flex-wrap gap-1">
                <span
                  v-for="number in viewingRoom.timeline"
                  :key="number"
                  class="inline-block bg-primary text-primary-foreground px-2 py-1 rounded text-sm"
                >
                  {{ number }}
                </span>
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
import type { Player } from '@/lib/types';

interface Room {
  id: string;
  players: Player[];
  timeline: number[];
  lives: number;
  maxLives: number;
  numbersPerPlayer: number;
  state: 'lobby' | 'playing' | 'game-over' | 'victory';
  hostId: string;
  gameEvents: any[];
  playerCount?: number;
  createdAt?: string;
}

const rooms = ref<Room[]>([]);
const searchTerm = ref('');
const filterStatus = ref('all');
const isLoading = ref(false);
const showCreateModal = ref(false);
const editingRoom = ref<Room | null>(null);
const viewingRoom = ref<Room | null>(null);

const roomForm = ref({
  maxLives: 3,
  numbersPerPlayer: 6,
});

const filteredRooms = computed(() => {
  let filtered = rooms.value;

  // Filter by search term
  if (searchTerm.value) {
    filtered = filtered.filter((room) =>
      room.id.toLowerCase().includes(searchTerm.value.toLowerCase()),
    );
  }

  // Filter by status
  if (filterStatus.value !== 'all') {
    filtered = filtered.filter((room) => room.state === filterStatus.value);
  }

  return filtered;
});

const totalPlayers = computed(() => {
  return rooms.value.reduce((total, room) => total + (room.playerCount || 0), 0);
});

const activeRooms = computed(() => {
  return rooms.value.filter((room) => room.state === 'playing').length;
});

const lobbyRooms = computed(() => {
  return rooms.value.filter((room) => room.state === 'lobby').length;
});

const fetchRooms = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/rooms');
    const data = await response.json();

    if (data.success) {
      // Get detailed room info for each room
      const detailedRooms = await Promise.all(
        data.data.map(async (roomInfo: any) => {
          try {
            const detailResponse = await fetch(`http://localhost:3001/api/rooms/${roomInfo.id}`);
            const detailData = await detailResponse.json();
            if (detailData.success) {
              const roomData = detailData.data;
              roomData.playerCount = roomData.players?.length || 0;
              return roomData;
            }
            return roomInfo;
          } catch {
            return roomInfo;
          }
        }),
      );
      rooms.value = detailedRooms;
    }
  } catch (error) {
    console.error('Error fetching rooms:', error);
  }
};

const createRoom = async () => {
  isLoading.value = true;
  try {
    const response = await fetch('http://localhost:3001/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roomForm.value),
    });

    const data = await response.json();
    if (data.success) {
      await fetchRooms();
      closeModal();
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error('Error creating room:', error);
    alert('Failed to create room');
  } finally {
    isLoading.value = false;
  }
};

const updateRoom = async () => {
  if (!editingRoom.value) return;

  isLoading.value = true;
  try {
    const response = await fetch(`http://localhost:3001/api/rooms/${editingRoom.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roomForm.value),
    });

    const data = await response.json();
    if (data.success) {
      await fetchRooms();
      closeModal();
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error('Error updating room:', error);
    alert('Failed to update room');
  } finally {
    isLoading.value = false;
  }
};

const deleteRoom = async (room: Room) => {
  if (!confirm(`Are you sure you want to delete room ${room.id}?`)) return;

  try {
    const response = await fetch(`http://localhost:3001/api/rooms/${room.id}`, {
      method: 'DELETE',
    });

    const data = await response.json();
    if (data.success) {
      await fetchRooms();
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error('Error deleting room:', error);
    alert('Failed to delete room');
  }
};

const viewRoom = async (room: Room) => {
  try {
    const response = await fetch(`http://localhost:3001/api/rooms/${room.id}`);
    const data = await response.json();
    if (data.success) {
      viewingRoom.value = data.data;
    }
  } catch (error) {
    console.error('Error fetching room details:', error);
  }
};

const editRoom = (room: Room) => {
  editingRoom.value = room;
  roomForm.value = {
    maxLives: room.maxLives,
    numbersPerPlayer: room.numbersPerPlayer,
  };
};

const closeModal = () => {
  showCreateModal.value = false;
  editingRoom.value = null;
  roomForm.value = {
    maxLives: 3,
    numbersPerPlayer: 6,
  };
};

const getStatusColor = (status: string) => {
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

const getHostName = (room: Room) => {
  if (!room.hostId || !room.players) return null;
  const host = room.players.find((p) => p.id === room.hostId);
  return host?.username || null;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'Unknown';
  return new Date(dateString).toLocaleDateString();
};

onMounted(() => {
  fetchRooms();
});
</script>
