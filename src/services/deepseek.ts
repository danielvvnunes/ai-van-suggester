const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY as string;
const API_URL = "https://api.deepseek.com/chat/completions";

type RecommendationResult = {
  features: string[];
  size: "standard" | "long" | "extralong" | null;
  transmission: "manual" | "automatic" | null;
};

/**
 * Asks DeepSeek for the most suitable Mercedes-Benz Vito configuration
 * based on the selected vehicle purposes.
 *
 * Returns:
 * - the feature IDs that should be pre-selected
 * - the recommended vehicle size
 * - the recommended transmission
 */
export async function getRecommendations(
  selectedPurposes: Array<{ id: string; title: string }>,
  allFeatures: Array<{ id: string; label: string }>,
): Promise<RecommendationResult> {
  const purposeList = selectedPurposes
    .map((purpose) => purpose.title)
    .join(", ");
  const featureList = allFeatures
    .map((feature) => `- id: "${feature.id}", label: "${feature.label}"`)
    .join("\n");

  const prompt = `You are a Mercedes-Benz Vito van configurator assistant.

A customer has selected the following vehicle purposes: ${purposeList}

Available vehicle sizes:
- standard
- long
- extralong

Available transmissions:
- manual
- automatic

Below is the full list of available features and equipment (each with an ID and label):
${featureList}

Based on the customer's selected purposes, choose:
- the most relevant feature IDs
- one vehicle size from the allowed list
- one transmission from the allowed list

Respond ONLY with valid JSON in this exact format:
{
  "features": ["feature-id-1", "feature-id-2"],
  "size": "standard",
  "transmission": "automatic"
}

Do not include any explanation or extra text.`;

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? "{}";

  const cleaned = content.replace(/```(?:json)?/g, "").trim();
  const parsed = JSON.parse(cleaned) as Partial<RecommendationResult>;

  const validIds = new Set(allFeatures.map((feature) => feature.id));
  const validSizes = new Set<NonNullable<RecommendationResult["size"]>>([
    "standard",
    "long",
    "extralong",
  ]);
  const validTransmissions = new Set<
    NonNullable<RecommendationResult["transmission"]>
  >(["manual", "automatic"]);

  return {
    features: Array.isArray(parsed.features)
      ? parsed.features.filter(
          (id): id is string => typeof id === "string" && validIds.has(id),
        )
      : [],
    size:
      typeof parsed.size === "string" && validSizes.has(parsed.size)
        ? parsed.size
        : null,
    transmission:
      typeof parsed.transmission === "string" &&
      validTransmissions.has(parsed.transmission)
        ? parsed.transmission
        : null,
  };
}
