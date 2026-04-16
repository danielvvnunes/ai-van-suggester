const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY as string;
const API_URL = "https://api.deepseek.com/chat/completions";

/**
 * Asks DeepSeek which feature IDs are most relevant for the given vehicle purposes.
 * Returns an array of feature IDs that should be pre-selected for the user.
 */
export async function getRecommendedFeatures(
  selectedPurposes: Array<{ id: string; title: string }>,
  allFeatures: Array<{ id: string; label: string }>,
): Promise<string[]> {
  const purposeList = selectedPurposes.map((p) => p.title).join(", ");
  const featureList = allFeatures
    .map((f) => `- id: "${f.id}", label: "${f.label}"`)
    .join("\n");

  const prompt = `You are a Mercedes-Benz Vito van configurator assistant.

A customer has selected the following vehicle purposes: ${purposeList}

Below is the full list of available features and equipment (each with an ID and label):
${featureList}

Based on the customer's selected purposes, decide which features are most relevant and should be pre-selected for them.
Respond ONLY with a valid JSON array of feature IDs (strings), e.g.: ["roof-rails", "3-seats"]
Do not include any explanation or extra text — only the JSON array.`;

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
  const content: string = data.choices?.[0]?.message?.content ?? "[]";

  // Strip markdown code fences if the model wraps the JSON
  const cleaned = content.replace(/```(?:json)?/g, "").trim();
  const recommended: string[] = JSON.parse(cleaned);

  // Validate: only return IDs that actually exist in allFeatures
  const validIds = new Set(allFeatures.map((f) => f.id));
  return recommended.filter((id) => validIds.has(id));
}
