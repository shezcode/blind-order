<template>
  <footer class="bg-card border-t border-border mt-auto">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
        <!-- Brand section -->
        <div class="md:col-span-2">
          <div class="flex items-center space-x-2 mb-4">
            <div class="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span class="text-primary-foreground font-bold text-sm">🎯</span>
            </div>
            <span class="text-lg font-bold text-foreground">BlindOrder</span>
          </div>
          <p class="text-muted-foreground text-sm mb-4 max-w-md">
            A cooperative number sequencing game that tests your team's coordination and
            communication skills. Work together to play all numbers in ascending order!
          </p>
        </div>

        <!-- Quick Links -->
        <div>
          <h3 class="font-semibold text-foreground mb-3">Quick Links</h3>
          <ul class="space-y-2 text-sm">
            <li>
              <router-link
                to="/"
                class="text-muted-foreground hover:text-foreground transition-colors"
              >
                Home
              </router-link>
            </li>
            <li>
              <router-link
                to="/create"
                class="text-muted-foreground hover:text-foreground transition-colors"
              >
                Create Room
              </router-link>
            </li>
            <li>
              <a href="#" class="text-muted-foreground hover:text-foreground transition-colors">
                How to Play
              </a>
            </li>
            <li>
              <a href="#" class="text-muted-foreground hover:text-foreground transition-colors">
                Rules
              </a>
            </li>
          </ul>
        </div>

        <!-- Game Info -->
        <div>
          <h3 class="font-semibold text-foreground mb-3">Game Info</h3>
          <ul class="space-y-2 text-sm text-muted-foreground">
            <li>🎮 Cooperative gameplay</li>
            <li>👥 2-16 players</li>
            <li>⏱️ 5-15 minute rounds</li>
            <li>🧠 Strategy & coordination</li>
          </ul>
        </div>
      </div>

      <!-- Bottom section -->
      <div class="border-t border-border pt-6 mt-6">
        <div class="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div class="text-sm text-muted-foreground">© {{ currentYear }} BlindOrder.</div>

          <div class="flex items-center space-x-6 text-sm">
            <a href="#" class="text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" class="text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </a>
            <a href="#" class="text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const currentYear = computed(() => new Date().getFullYear());
</script>
