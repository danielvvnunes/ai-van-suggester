<script setup lang="ts">
import { computed, readonly, ref } from "vue";
import purposes from "../data/purpose_of_vehicle.json";

type Purpose = {
  id: string;
  title: string;
  image: string;
  desc: string;
};

type ApiFeature = {
  id: string;
  label: string;
  selected: boolean;
};

type ApiResponse = {
  selection: ApiFeature[];
  all: ApiFeature[];
};

export type SelectedFeature = { id: string; label: string };

defineProps<{ open: boolean }>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "apply", features: SelectedFeature[]): void;
}>();

const step = ref(1);
const selectedPurposes = ref<string[]>([]);
const apiLoading = ref(false);
const apiError = ref<string | null>(null);

// Step 2 state
const selectionFeatures = ref<ApiFeature[]>([]);
const allFeatures = ref<ApiFeature[]>([]);
const selectedFeatureIds = ref<Set<string>>(new Set());
const dropdownValue = ref("");

const purposesWithImages = computed(() =>
  (purposes as Purpose[]).map((purpose) => ({
    ...purpose,
    image: new URL(`../assets/use-cases/${purpose.image}`, import.meta.url)
      .href,
  })),
);

const selectedPurposeLabels = computed(() =>
  (purposes as Purpose[])
    .filter((p) => selectedPurposes.value.includes(p.id))
    .map((p) => p.title)
    .join(" - "),
);

function togglePurpose(id: string) {
  const index = selectedPurposes.value.indexOf(id);
  if (index === -1) {
    selectedPurposes.value.push(id);
  } else {
    selectedPurposes.value.splice(index, 1);
  }
}

function toggleSelectionFeature(id: string) {
  if (selectedFeatureIds.value.has(id)) {
    selectedFeatureIds.value.delete(id);
  } else {
    selectedFeatureIds.value.add(id);
  }
}

function onDropdownChange() {
  const id = dropdownValue.value;
  if (!id) return;
  selectedFeatureIds.value.add(id);
  dropdownValue.value = "";
}

// Features visible as pills = selectionFeatures + any user-added from "all" not already in selection
const extraFeatures = computed(() =>
  allFeatures.value.filter(
    (f) =>
      selectedFeatureIds.value.has(f.id) &&
      !selectionFeatures.value.some((s) => s.id === f.id),
  ),
);

// Dropdown options = "all" items not already shown as pills in selectionFeatures
const dropdownOptions = computed(() =>
  allFeatures.value.filter(
    (f) => !selectionFeatures.value.some((s) => s.id === f.id),
  ),
);

async function goToStep2() {
  if (selectedPurposes.value.length === 0) return;

  apiLoading.value = true;
  apiError.value = null;

  try {
    const chosenPurposes = (purposes as Purpose[]).filter((p) =>
      selectedPurposes.value.includes(p.id),
    );

    const payload = {
      usecases: chosenPurposes.map((p) => ({ name: p.title, desc: p.desc })),
    };

    // ====================================
    // Uncomment after backend is readonly
    // ====================================

    // const response = await fetch(
    //   "https://dev.api.oneweb.mercedes-benz.com/vans/equipment/search/api/filter-options",
    //   {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify(payload),
    //   },
    // );

    // if (!response.ok) {
    //   throw new Error(`API request failed: ${response.status}`);
    // }

    // const data: ApiResponse = await response.json();

    // ====================================

    console.log("API payload:", payload);

    // Mock API response — replace with real fetch when API is ready
    await new Promise((resolve) => setTimeout(resolve, 600));
    const data: ApiResponse = {
      selection: [
        { id: "roof-rails", label: "Roof rails", selected: true },
        { id: "parking-assist", label: "Parking assist", selected: true },
        { id: "cruise-control", label: "Cruise control", selected: false },
        { id: "3-seats", label: "3 seats", selected: true },
        { id: "climate-control", label: "Climate control", selected: false },
        { id: "navigation", label: "Navigation system", selected: true },
        { id: "cargo-liner", label: "Cargo liner", selected: false },
        { id: "tow-bar", label: "Tow bar", selected: false },
        { id: "led-lights", label: "LED headlights", selected: true },
        { id: "keyless-entry", label: "Keyless entry", selected: false },
      ],
      all: [
        { id: "apple-carplay", label: "Apple CarPlay", selected: false },
        { id: "android-auto", label: "Android Auto", selected: false },
        { id: "360-camera", label: "360° camera", selected: false },
        { id: "blind-spot", label: "Blind spot assist", selected: false },
        { id: "heated-seats", label: "Heated seats", selected: false },
        { id: "lane-assist", label: "Lane keeping assist", selected: false },
        { id: "rear-camera", label: "Rear view camera", selected: false },
        { id: "ambient-light", label: "Ambient lighting", selected: false },
        { id: "usb-c", label: "USB-C charging ports", selected: false },
        { id: "roof-rack", label: "Roof rack", selected: false },
        { id: "partition-wall", label: "Partition wall", selected: false },
        { id: "sliding-door", label: "Electric sliding door", selected: false },
      ],
    };

    selectionFeatures.value = data.selection;
    allFeatures.value = data.all;

    const preSelected = new Set(
      data.selection.filter((f) => f.selected).map((f) => f.id),
    );
    selectedFeatureIds.value = preSelected;
  } catch (error) {
    apiError.value =
      error instanceof Error ? error.message : "Failed to reach API.";
    selectionFeatures.value = [];
    allFeatures.value = [];
    selectedFeatureIds.value = new Set();
  } finally {
    apiLoading.value = false;
    step.value = 2;
  }
}

function close() {
  step.value = 1;
  selectedPurposes.value = [];
  apiLoading.value = false;
  apiError.value = null;
  selectionFeatures.value = [];
  allFeatures.value = [];
  selectedFeatureIds.value = new Set();
  dropdownValue.value = "";
  emit("close");
}

function finish() {
  const allVisible = [...selectionFeatures.value, ...extraFeatures.value];
  const selected = allVisible.filter((f) => selectedFeatureIds.value.has(f.id));
  emit(
    "apply",
    selected.map((f) => ({ id: f.id, label: f.label })),
  );
  close();
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="close">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: step === 1 ? '40%' : '80%' }"
          />
        </div>

        <button class="close-btn" aria-label="Close" @click="close">✕</button>

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
                v-for="purpose in purposesWithImages"
                :key="purpose.id"
                class="purpose-card"
                :class="{ selected: selectedPurposes.includes(purpose.id) }"
                @click="togglePurpose(purpose.id)"
              >
                <img
                  :src="purpose.image"
                  :alt="purpose.title"
                  class="purpose-img"
                />
                <span class="purpose-label">{{ purpose.title }}</span>
              </button>
            </div>
          </div>

          <div class="modal-footer step1-footer">
            <button
              class="continue-link"
              :disabled="selectedPurposes.length === 0 || apiLoading"
              @click="goToStep2"
            >
              <span v-if="apiLoading" class="spinner" />
              <span v-else>› Continue</span>
            </button>
          </div>
        </template>

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

            <div v-if="apiError" class="api-error">
              ⚠ Could not load recommendations: {{ apiError }}
            </div>

            <div class="feature-pills">
              <button
                v-for="feature in selectionFeatures"
                :key="feature.id"
                class="pill"
                :class="{ selected: selectedFeatureIds.has(feature.id) }"
                @click="toggleSelectionFeature(feature.id)"
              >
                {{ feature.label }}
                <span class="pill-circle" />
              </button>

              <button
                v-for="feature in extraFeatures"
                :key="feature.id"
                class="pill selected"
                @click="toggleSelectionFeature(feature.id)"
              >
                {{ feature.label }}
                <span class="pill-circle" />
              </button>
            </div>

            <div class="search-box">
              <span class="search-icon">🔍</span>
              <select
                v-model="dropdownValue"
                class="search-select"
                @change="onDropdownChange"
              >
                <option value="" disabled>
                  Looking for something else? Browse our equipment
                </option>
                <option
                  v-for="option in dropdownOptions"
                  :key="option.id"
                  :value="option.id"
                >
                  {{ option.label }}
                </option>
              </select>
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
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

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

.modal-body {
  padding: 28px 32px 16px;
  overflow-y: auto;
  flex: 1;
}

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

.recommended-label {
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 12px;
  color: #111;
}

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

.search-select {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  color: #555;
  background: transparent;
  cursor: pointer;
  appearance: none;
}

.search-select option {
  color: #111;
}

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

.api-error {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 12px;
  color: #856404;
  margin-bottom: 12px;
}
</style>
