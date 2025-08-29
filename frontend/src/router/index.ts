import CreateRoomView from '@/views/CreateRoomView.vue';
import HomeView from '@/views/HomeView.vue';
import PlayerListView from '@/views/PlayerListView.vue';
import RoomsListView from '@/views/RoomsListView.vue';
import RoomView from '@/views/RoomView.vue';
import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
  },
  {
    path: '/create',
    name: 'CreateRoom',
    component: CreateRoomView,
  },
  {
    path: '/rooms',
    name: 'RoomsList',
    component: RoomsListView,
  },
  {
    path: '/players',
    name: 'PlayersList',
    component: PlayerListView,
  },
  {
    path: '/room/:id',
    name: 'Room',
    component: RoomView,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
