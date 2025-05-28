<template>
  <header class="bg-card border-b border-border shadow-sm">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Logo/Brand -->
        <div class="flex items-center">
          <router-link
            to="/"
            class="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span class="text-primary-foreground font-bold text-lg">🎯</span>
            </div>
            <span class="text-xl font-bold text-foreground">BlindOrder</span>
          </router-link>
        </div>

        <!-- Navigation -->
        <nav class="hidden md:flex items-center space-x-8">
          <router-link
            to="/"
            class="text-muted-foreground hover:text-foreground transition-colors font-medium"
            :class="{ 'text-foreground': $route.path === '/' }"
          >
            Home
          </router-link>
          <router-link
            to="/create"
            class="text-muted-foreground hover:text-foreground transition-colors font-medium"
            :class="{ 'text-foreground': $route.path === '/create' }"
          >
            Create Room
          </router-link>
        </nav>

        <!-- Right side actions -->
        <div class="flex items-center space-x-4">
          <!-- Theme toggle (placeholder for now) -->
          <button
            class="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
            title="Toggle theme"
          >
            <span class="text-lg">🌙</span>
          </button>

          <!-- Mobile menu button -->
          <button
            @click="toggleMobileMenu"
            class="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
          >
            <span class="text-lg">☰</span>
          </button>
        </div>
      </div>

      <!-- Mobile Navigation -->
      <div v-if="showMobileMenu" class="md:hidden py-4 border-t border-border">
        <div class="flex flex-col space-y-4">
          <router-link
            to="/"
            @click="closeMobileMenu"
            class="text-muted-foreground hover:text-foreground transition-colors font-medium"
            :class="{ 'text-foreground': $route.path === '/' }"
          >
            Home
          </router-link>
          <router-link
            to="/create"
            @click="closeMobileMenu"
            class="text-muted-foreground hover:text-foreground transition-colors font-medium"
            :class="{ 'text-foreground': $route.path === '/create' }"
          >
            Create Room
          </router-link>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const showMobileMenu = ref(false);

const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value;
};

const closeMobileMenu = () => {
  showMobileMenu.value = false;
};
</script>
