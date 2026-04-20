<script setup lang="ts">
import { computed, ref } from "vue";
import VanModal from "./components/VanModal.vue";
import type { ApplyPayload, SelectedFeature } from "./components/VanModal.vue";

type VehicleLength = "standard" | "long" | "extralong";
type VehicleTransmission = "manual" | "automatic";
type VehicleType = "panelvan" | "chassis" | "tourer";

const modalOpen = ref(false);
const size = ref<VehicleLength>("standard");
const transmission = ref<VehicleTransmission>("manual");
const vehicleType = ref<VehicleType>("panelvan");
const highlightFeatures = ref<SelectedFeature[]>([]);

function handleApply(payload: ApplyPayload) {
  highlightFeatures.value = payload.features.slice(0, 5);

  if (!payload.vehicle) return;

  size.value = payload.vehicle.length.toLowerCase() as VehicleLength;
  transmission.value =
    payload.vehicle.transmission.toLowerCase() as VehicleTransmission;
  vehicleType.value = payload.vehicle.type.toLowerCase() as VehicleType;
}

const tdImage = computed(
  () =>
    new URL(
      `./assets/td-combinations/${vehicleType.value}-${size.value}-${transmission.value}.jpeg`,
      import.meta.url,
    ).href,
);
</script>

<template>
  <main class="page">
    <div class="hero-frame">
      <img
        src="./assets/panelvan-stage.jpg"
        alt="Mercedes-Benz Vans homepage mock"
        class="hero-image"
        @click="modalOpen = true"
        style="cursor: pointer"
      />
      <img
        :src="tdImage"
        alt="Mercedes-Benz Vans homepage mock"
        class="hero-image"
      />

      <section v-if="highlightFeatures.length > 0" class="product-highlights">
        <h2 class="highlights-title">Product Highlights</h2>
        <div class="highlights-grid">
          <div
            v-for="(feature, index) in highlightFeatures"
            :key="feature.id"
            class="feature-card"
            :class="
              index === 0
                ? 'card-large'
                : index === 1
                  ? 'card-medium'
                  : 'card-small'
            "
          >
            <div class="card-content">
              <h3 class="card-title">{{ feature.label }}</h3>
              <button class="card-btn">Show more</button>
            </div>
          </div>
        </div>
      </section>

      <img
        src="./assets/page.jpg"
        alt="Mercedes-Benz Vans homepage mock"
        class="hero-image"
      />
    </div>

    <VanModal
      :open="modalOpen"
      @close="modalOpen = false"
      @apply="handleApply"
    />
  </main>
</template>

<style scoped>
.page {
  width: 100%;
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

.product-highlights {
  padding: 40px 48px;
  background: #fff;
}

.highlights-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 24px;
  color: #111;
}

.highlights-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto auto;
  gap: 12px;
}

.feature-card {
  position: relative;
  border-radius: 4px;
  overflow: hidden;
  min-height: 260px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex;
  align-items: flex-end;
}

.card-large {
  grid-column: 1 / 3;
  grid-row: 1;
  min-height: 320px;
}

.card-medium {
  grid-column: 3 / 4;
  grid-row: 1;
  min-height: 320px;
}

.card-small {
  grid-column: auto;
  grid-row: 2;
}

.card-content {
  padding: 20px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.75) 0%, transparent 100%);
  width: 100%;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 6px;
  line-height: 1.3;
}

.card-btn {
  margin-top: 12px;
  background: #0078d4;
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.card-btn:hover {
  background: #005fa3;
}

@media (max-width: 700px) {
  .highlights-grid {
    grid-template-columns: 1fr;
  }

  .card-large,
  .card-medium,
  .card-small {
    grid-column: auto;
    grid-row: auto;
  }
}
</style>
