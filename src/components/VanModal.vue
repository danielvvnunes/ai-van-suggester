<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from "vue";
import purposes from "../data/purpose_of_vehicle.json";

const props = defineProps<{ open: boolean }>();

let previousBodyOverflow = "";
let previousBodyTouchAction = "";

function lockBodyScroll() {
  if (typeof document === "undefined") return;

  previousBodyOverflow = document.body.style.overflow;
  previousBodyTouchAction = document.body.style.touchAction;

  document.body.style.overflow = "hidden";
  document.body.style.touchAction = "none";
}

function unlockBodyScroll() {
  if (typeof document === "undefined") return;

  document.body.style.overflow = previousBodyOverflow;
  document.body.style.touchAction = previousBodyTouchAction;
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) lockBodyScroll();
    else unlockBodyScroll();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  unlockBodyScroll();
});

type Purpose = {
  id: string;
  name: string;
  image: string;
  description: string;
};

type FeatureCategory = string;

type RawApiFeature = {
  id: string;
  label: string;
  selected: boolean;
  category?: FeatureCategory;
};

type ApiFeature = {
  id: string;
  label: string;
  displayLabel: string;
  selected: boolean;
  category: FeatureCategory;
};

export type ApiVehicle = {
  length: string;
  transmission: string;
  type: string;
};

type ApiResponse = {
  selection: RawApiFeature[];
  all: RawApiFeature[];
  vehicle?: ApiVehicle;
};

export type SelectedFeature = {
  id: string;
  label: string;
};

export type ApplyPayload = {
  features: SelectedFeature[];
  vehicle: ApiVehicle | null;
};

const emit = defineEmits<{
  (e: "close"): void;
  (e: "apply", payload: ApplyPayload): void;
}>();

const step = ref(1);
const selectedPurposes = ref<string[]>([]);
const customPurpose = ref("");
const apiLoading = ref(false);
const apiError = ref<string | null>(null);

const selectionFeatures = ref<ApiFeature[]>([]);
const allFeatures = ref<ApiFeature[]>([]);
const selectedFeatureIds = ref<Set<string>>(new Set());
const vehicle = ref<ApiVehicle | null>(null);
const searchQuery = ref("");

const preservedTerms = [
  "MBUX",
  "ABS",
  "ESP",
  "KEP/ABH",
  "9G-TRONIC",
  "TEMPOMAT",
  "ECO",
  "LED",
  "DAB",
  "USB",
  "ARTICO",
  "M+S",
  "HVO",
  "EC",
  "EU",
  "COC",
  "AEJ",
  "PSM",
  "WET WIPER SYSTEM",
];

function normalizeFeatureLabel(label: string) {
  let normalized = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  for (const term of preservedTerms) {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    normalized = normalized.replace(new RegExp(escapedTerm, "gi"), term);
  }

  return normalized;
}

function enrichFeature(feature: RawApiFeature): ApiFeature {
  return {
    ...feature,
    displayLabel: normalizeFeatureLabel(feature.label),
    category: feature.category?.trim() || "Other",
  };
}

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
    .map((p) => p.name)
    .join(" - "),
);

const extraFeatures = computed(() =>
  allFeatures.value.filter(
    (f) =>
      selectedFeatureIds.value.has(f.id) &&
      !selectionFeatures.value.some((s) => s.id === f.id),
  ),
);

const dropdownOptions = computed(() =>
  allFeatures.value.filter(
    (f) => !selectionFeatures.value.some((s) => s.id === f.id),
  ),
);

const canContinueToStep2 = computed(
  () =>
    selectedPurposes.value.length > 0 || customPurpose.value.trim().length > 0,
);

const filteredGroupedOptions = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  const filtered = dropdownOptions.value.filter((feature) => {
    if (!query) return true;

    return (
      feature.displayLabel.toLowerCase().includes(query) ||
      feature.category.toLowerCase().includes(query)
    );
  });

  const limited = query ? filtered.slice(0, 24) : filtered.slice(0, 18);

  const groups = new Map<FeatureCategory, ApiFeature[]>();

  for (const feature of limited) {
    if (!groups.has(feature.category)) {
      groups.set(feature.category, []);
    }
    groups.get(feature.category)!.push(feature);
  }

  return Array.from(groups.entries()).map(([category, features]) => ({
    category,
    features,
  }));
});

function togglePurpose(id: string) {
  const i = selectedPurposes.value.indexOf(id);

  if (i === -1) selectedPurposes.value.push(id);
  else selectedPurposes.value.splice(i, 1);
}

function toggleSelectionFeature(id: string) {
  const next = new Set(selectedFeatureIds.value);

  next.has(id) ? next.delete(id) : next.add(id);

  selectedFeatureIds.value = next;
}

function addFeature(id: string) {
  const next = new Set(selectedFeatureIds.value);
  next.add(id);
  selectedFeatureIds.value = next;
  searchQuery.value = "";
}

async function goToStep2() {
  if (!canContinueToStep2.value) return;

  apiLoading.value = true;
  apiError.value = null;

  try {
    const chosenPurposes = (purposes as Purpose[]).filter((p) =>
      selectedPurposes.value.includes(p.id),
    );

    const usecases = chosenPurposes.map((p) => ({
      name: p.name,
      description: p.description,
    }));

    if (customPurpose.value.trim()) {
      usecases.push({
        name: "Custom",
        description: customPurpose.value.trim(),
      });
    }

    const response = await fetch(
      "https://dev.api.oneweb.mercedes-benz.com/vans/equipment/search/api/filter-options",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ usecases }),
      },
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data: ApiResponse = await response.json();

    selectionFeatures.value = data.selection.map(enrichFeature);
    allFeatures.value = data.all.map(enrichFeature);
    vehicle.value = data.vehicle ?? null;

    selectedFeatureIds.value = new Set(
      data.selection.filter((f) => f.selected).map((f) => f.id),
    );
  } catch (error) {
    apiError.value =
      error instanceof Error ? error.message : "Failed to reach API.";

    selectionFeatures.value = [];
    allFeatures.value = [];
    selectedFeatureIds.value = new Set();
    vehicle.value = null;
  } finally {
    apiLoading.value = false;
    step.value = 2;
  }
}

function resetState() {
  step.value = 1;
  selectedPurposes.value = [];
  customPurpose.value = "";
  apiLoading.value = false;
  apiError.value = null;
  selectionFeatures.value = [];
  allFeatures.value = [];
  selectedFeatureIds.value = new Set();
  vehicle.value = null;
  searchQuery.value = "";
}

function close() {
  resetState();
  emit("close");
}

function finish() {
  const selectedFeatures = [...selectionFeatures.value, ...extraFeatures.value]
    .filter((f) => selectedFeatureIds.value.has(f.id))
    .map((f) => ({
      id: f.id,
      label: f.displayLabel,
    }));

  emit("apply", {
    features: selectedFeatures,
    vehicle: vehicle.value,
  });

  close();
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="props.open" class="modal-backdrop" @click.self="close">
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
                What is the main purpose of your Sprinter?
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
                    :alt="purpose.name"
                    class="purpose-img"
                  />
                  <span class="purpose-label">{{ purpose.name }}</span>
                </button>
              </div>

              <div class="custom-purpose-wrapper">
                <label class="custom-purpose-label" for="custom-purpose">
                  Anything else you'd like us to know?
                </label>

                <textarea
                  id="custom-purpose"
                  v-model="customPurpose"
                  class="custom-purpose-textarea"
                  placeholder="Tell us more about your day-to-day needs, payload, routes, passengers, loading habits or anything else relevant..."
                  rows="3"
                />
              </div>
            </div>

            <div class="modal-footer step1-footer">
              <button
                class="continue-link"
                :disabled="!canContinueToStep2 || apiLoading"
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
                What do you particularly value in the Sprinter? What must it
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
                  {{ feature.displayLabel }}
                  <span class="pill-circle" />
                </button>

                <button
                  v-for="feature in extraFeatures"
                  :key="feature.id"
                  class="pill selected"
                  @click="toggleSelectionFeature(feature.id)"
                >
                  {{ feature.displayLabel }}
                  <span class="pill-circle" />
                </button>
              </div>

              <div class="equipment-search">
                <div class="equipment-search-input">
                  <span class="search-icon">🔍</span>

                  <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Search equipment"
                  />
                </div>

                <div
                  v-if="filteredGroupedOptions.length"
                  class="equipment-search-results"
                >
                  <div
                    v-for="group in filteredGroupedOptions"
                    :key="group.category"
                    class="equipment-category-group"
                  >
                    <p class="equipment-category-title">
                      {{ group.category }}
                    </p>

                    <button
                      v-for="option in group.features"
                      :key="option.id"
                      class="equipment-option"
                      @click="addFeature(option.id)"
                    >
                      {{ option.displayLabel }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-footer step2-footer">
              <button class="continue-btn" @click="finish">
                Continue to your Sprinter
              </button>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.22s ease;
}

.modal-fade-enter-active .modal,
.modal-fade-leave-active .modal {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal,
.modal-fade-leave-to .modal {
  opacity: 0;
  transform: translateY(8px) scale(0.985);
}

.modal-fade-enter-to .modal,
.modal-fade-leave-from .modal {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #fff;
  border-radius: 4px;
  width: min(900px, 95vw);
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

.custom-purpose-wrapper {
  margin-top: 32px;
}

.custom-purpose-label {
  display: block;
  font-size: 15px;
  font-weight: 500;
  color: #111;
  margin-bottom: 12px;
  line-height: 1.4;
}

.custom-purpose-textarea {
  width: 100%;
  min-height: 148px;
  box-sizing: border-box;
  border: 1px solid #e3e3e3;
  border-radius: 12px;
  padding: 18px 20px;
  font-size: 14px;
  line-height: 1.65;
  color: #111;
  resize: vertical;
  font-family: inherit;
  background: linear-gradient(180deg, #ffffff 0%, #fcfcfc 100%);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.custom-purpose-textarea::placeholder {
  color: #919191;
}

.custom-purpose-textarea:focus {
  outline: none;
  border-color: #c7c7c7;
  box-shadow:
    0 0 0 4px rgba(0, 0, 0, 0.035),
    0 6px 18px rgba(0, 0, 0, 0.04);
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

.equipment-search {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.equipment-search-input {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border: 1px solid #dcdcdc;
  border-radius: 999px;
  background: #fff;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.equipment-search-input:focus-within {
  border-color: #0078d4;
  box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.08);
}

.equipment-search-input input {
  border: none;
  outline: none;
  font-size: 13px;
  flex: 1;
  background: transparent;
}

.search-icon {
  font-size: 14px;
  opacity: 0.5;
}

.equipment-search-results {
  max-height: 220px;
  overflow-y: auto;
  border-radius: 12px;
  border: 1px solid #e6e6e6;
  background: #fff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.equipment-search-results::-webkit-scrollbar {
  width: 6px;
}

.equipment-search-results::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 4px;
}

.equipment-category-group + .equipment-category-group {
  border-top: 1px solid #ececec;
}

.equipment-category-title {
  margin: 0;
  padding: 12px 16px 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #6f6f6f;
  background: #fafafa;
  position: sticky;
  top: 0;
  z-index: 1;
}

.equipment-option {
  width: 100%;
  padding: 11px 16px;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.12s ease;
  color: #111;
}

.equipment-option:hover {
  background: #f5f9ff;
}

.equipment-option + .equipment-option {
  border-top: 1px solid #f5f5f5;
}
</style>
