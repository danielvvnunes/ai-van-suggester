<script setup lang="ts">
import { ref, computed } from "vue";
import purposes from "../data/purpose_of_vehicle.json";
import features from "../data/features_and_equipment.json";
import { getRecommendedFeatures } from "../services/deepseek";

defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();

const step = ref(1);
const selectedPurposes = ref<string[]>([]);
const selectedFeatures = ref<string[]>([]);
const featureSearch = ref("");
const aiLoading = ref(false);
const aiError = ref<string | null>(null);

function togglePurpose(id: string) {
  const idx = selectedPurposes.value.indexOf(id);
  if (idx === -1) selectedPurposes.value.push(id);
  else selectedPurposes.value.splice(idx, 1);
}

function toggleFeature(id: string) {
  const idx = selectedFeatures.value.indexOf(id);
  if (idx === -1) selectedFeatures.value.push(id);
  else selectedFeatures.value.splice(idx, 1);
}

const filteredFeatures = computed(() => {
  const q = featureSearch.value.toLowerCase();
  if (!q) return features;
  return features.filter((f) => f.label.toLowerCase().includes(q));
});

const selectedPurposeLabels = computed(() =>
  purposes
    .filter((p) => selectedPurposes.value.includes(p.id))
    .map((p) => p.title)
    .join(" - "),
);

async function goToStep2() {
  if (selectedPurposes.value.length === 0) return;

  aiLoading.value = true;
  aiError.value = null;

  try {
    const chosenPurposes = purposes.filter((p) =>
      selectedPurposes.value.includes(p.id),
    );
    const recommended = await getRecommendedFeatures(chosenPurposes, features);
    selectedFeatures.value = recommended;
  } catch (err) {
    aiError.value =
      err instanceof Error ? err.message : "Failed to reach AI service.";
    selectedFeatures.value = [];
  } finally {
    aiLoading.value = false;
    step.value = 2;
  }
}

function close() {
  step.value = 1;
  selectedPurposes.value = [];
  selectedFeatures.value = [];
  featureSearch.value = "";
  aiError.value = null;
  emit("close");
}

function finish() {
  console.log("Selected purposes:", selectedPurposes.value);
  console.log("Selected features:", selectedFeatures.value);
  close();
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="close">
      <div class="modal" role="dialog" aria-modal="true">
        <!-- Progress bar -->
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: step === 1 ? '40%' : '80%' }"
          />
        </div>

        <!-- Close -->
        <button class="close-btn" aria-label="Close" @click="close">✕</button>

        <!-- ───── STEP 1 ───── -->
        <template v-if="step === 1">
          <div class="modal-body">
            <h2 class="modal-title">
              <span class="star-icon">✦</span>
              What is the main purpose of your Vito panel van?
            </h2>
            <p class="modal-subtitle">
              Choose one or more options. Your answers will help us understand
              what you're looking for.
            </p>

            <div class="purpose-grid">
              <button
                v-for="p in purposes"
                :key="p.id"
                class="purpose-card"
                :class="{ selected: selectedPurposes.includes(p.id) }"
                @click="togglePurpose(p.id)"
              >
                <img :src="p.image" :alt="p.title" class="purpose-img" />
                <span class="purpose-label">{{ p.title }}</span>
              </button>
            </div>
          </div>

          <div class="modal-footer step1-footer">
            <button
              class="continue-link"
              :disabled="selectedPurposes.length === 0 || aiLoading"
              @click="goToStep2"
            >
              <span v-if="aiLoading" class="spinner" />
              <span v-else>› Continue</span>
            </button>
          </div>
        </template>

        <!-- ───── STEP 2 ───── -->
        <template v-else>
          <div class="modal-body">
            <h2 class="modal-title">
              <span class="star-icon">✦</span>
              What do you particularly value in the Vito panel van? What must it
              fulfil to best support your working day?
            </h2>
            <p class="modal-subtitle">
              Choose one or more options. Your answers will help us understand
              what you're looking for.
            </p>

            <p class="recommended-label">
              Recommended features for {{ selectedPurposeLabels }}
            </p>

            <div v-if="aiError" class="ai-error">
              ⚠ AI recommendation unavailable: {{ aiError }}
            </div>

            <div class="feature-pills">
              <button
                v-for="f in filteredFeatures"
                :key="f.id"
                class="pill"
                :class="{ selected: selectedFeatures.includes(f.id) }"
                @click="toggleFeature(f.id)"
              >
                {{ f.label }}
                <span class="pill-circle" />
              </button>
            </div>

            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input
                v-model="featureSearch"
                type="text"
                placeholder="Looking for something else? Search in our equipment"
                class="search-input"
              />
              <span class="search-caret">▼</span>
            </div>
          </div>

          <div class="modal-footer step2-footer">
            <button class="continue-btn" @click="finish">
              Continue to your Vito Panel Van
            </button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Backdrop ── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* ── Modal shell ── */
.modal {
  background: #fff;
  border-radius: 4px;
  width: min(700px, 95vw);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* ── Progress bar ── */
.progress-bar {
  height: 4px;
  background: #e0e0e0;
  flex-shrink: 0;
}
.progress-fill {
  height: 100%;
  background: #0078d4;
  transition: width 0.3s ease;
}

/* ── Close button ── */
.close-btn {
  position: absolute;
  top: 14px;
  right: 16px;
  background: #f0f0f0;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333;
  z-index: 1;
}
.close-btn:hover {
  background: #ddd;
}

/* ── Body ── */
.modal-body {
  padding: 28px 32px 16px;
  overflow-y: auto;
  flex: 1;
}

/* ── Title ── */
.modal-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding-right: 32px;
  line-height: 1.3;
}
.star-icon {
  color: #0078d4;
  font-size: 22px;
  flex-shrink: 0;
  margin-top: 1px;
}
.modal-subtitle {
  font-size: 13px;
  color: #666;
  margin: 0 0 24px;
}

/* ── Purpose grid ── */
.purpose-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}
.purpose-card {
  display: flex;
  flex-direction: column;
  border: 2px solid #e0e0e0;
  border-radius: 4px;
  background: #fafafa;
  cursor: pointer;
  padding: 0;
  overflow: hidden;
  text-align: center;
  transition: border-color 0.15s;
}
.purpose-card:hover {
  border-color: #aaa;
}
.purpose-card.selected {
  border-color: #0078d4;
  background: #f0f7ff;
}
.purpose-img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  display: block;
}
.purpose-label {
  padding: 10px 8px;
  font-size: 13px;
  font-weight: 500;
  color: #111;
  line-height: 1.3;
}

/* ── Footer ── */
.modal-footer {
  flex-shrink: 0;
  padding: 14px 32px 24px;
}
.step1-footer {
  display: flex;
  justify-content: center;
}
.continue-link {
  background: none;
  border: none;
  color: #0078d4;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 0;
}
.continue-link:disabled {
  color: #aaa;
  cursor: not-allowed;
}
.continue-link:not(:disabled):hover {
  text-decoration: underline;
}

/* ── Recommended label ── */
.recommended-label {
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 12px;
  color: #111;
}

/* ── Feature pills ── */
.feature-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #ccc;
  border-radius: 999px;
  background: #fff;
  padding: 7px 14px;
  font-size: 13px;
  cursor: pointer;
  color: #111;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.pill:hover {
  border-color: #888;
}
.pill.selected {
  border-color: #0078d4;
  background: #e8f4ff;
}
.pill-circle {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid #aaa;
  display: inline-block;
  flex-shrink: 0;
}
.pill.selected .pill-circle {
  border-color: #0078d4;
  background: #0078d4;
}

/* ── Search box ── */
.search-box {
  display: flex;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 10px 14px;
  gap: 10px;
  background: #fff;
}
.search-icon {
  font-size: 15px;
  opacity: 0.5;
}
.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  color: #555;
  background: transparent;
}
.search-input::placeholder {
  color: #aaa;
}
.search-caret {
  font-size: 10px;
  color: #888;
}

/* ── Step 2 CTA button ── */
.step2-footer {
  display: flex;
  justify-content: center;
}
.continue-btn {
  background: #0078d4;
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 14px 32px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.continue-btn:hover {
  background: #005fa3;
}

/* ── Spinner ── */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid #0078d4;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  vertical-align: middle;
}

/* ── AI error banner ── */
.ai-error {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 12px;
  color: #856404;
  margin-bottom: 12px;
}
</style>
