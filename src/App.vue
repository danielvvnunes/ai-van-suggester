<script setup lang="ts">
const handleRecommendation = () => {
  console.log("Get AI recommendations");
};

const handleAssistant = () => {
  console.log("Ask AI assistant");
};
</script>

<template>
  <main class="page">
    <div class="hero-frame">
      <img
        src="./assets/home-page.png"
        alt="Mercedes-Benz Vans homepage mock"
        class="hero-image"
      />

      <div class="button-overlay">
        <button class="overlay-button primary" @click="handleRecommendation">
          Get AI recommendations
        </button>
        <button class="overlay-button secondary" @click="handleAssistant">
          Ask AI assistant
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.page {
  width: 100%;
  height: 100vh;
  margin: 0;
  overflow: hidden;
  background: #f2f2f2;
}

.hero-frame {
  position: relative;
  width: 100%;
  height: 100%;
}

.hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
}

.button-overlay {
  position: absolute;
  left: 8.5%;
  bottom: 10%;
  display: flex;
  gap: 9px;
  z-index: 5;
  height: 40px;
}

.overlay-button {
  appearance: none;
  border-radius: 999px;
  padding: 14px 20px;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;
}

.overlay-button.primary {
  border: 1px solid #d0d0d0;
  background: white;
  color: black;
  width: 380px;
}

.overlay-button.secondary {
  border: 1px solid #d0d0d0;
  background: white;
  color: #797979;
  width: 200px;
}

.overlay-button:hover {
  border-color: #111;
  box-shadow: 0 0 0 1px #797979;
}

@media (max-width: 900px) {
  .button-overlay {
    left: 3.5%;
    bottom: 6%;
    flex-direction: column;
  }

  .overlay-button {
    font-size: 14px;
    padding: 12px 16px;
  }
}
</style>
