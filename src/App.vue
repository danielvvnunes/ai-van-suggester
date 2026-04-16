<script setup lang="ts"></script>

<template>
  <main class="hero">
    <img
      src="./assets/home-page.png"
      alt="Mercedes-Benz Vans AI Vehicle Advisor"
      class="hero-image"
    />
  </main>
</template>

<style scoped>
.hero {
  width: 100%;
  height: calc(100vh - 72px); /* altura do header */
  overflow: hidden;
}

.hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
