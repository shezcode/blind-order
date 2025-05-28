<template>
  <div id="app" class="min-h-screen flex flex-col bg-background">
    <Header />
    <main class="flex-1">
      <router-view />
    </main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import Footer from './components/Footer.vue';
import Header from './components/Header.vue';

// Clean and simple!
</script>
