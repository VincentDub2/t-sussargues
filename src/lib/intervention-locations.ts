export const OTHER_INTERVENTION_LOCATION_VALUE = "__other";

export function parseInterventionLocation(formData: FormData) {
  const preset = String(formData.get("locationPreset") ?? "").trim();
  const otherLocation = String(formData.get("locationOther") ?? "").trim();

  if (preset === OTHER_INTERVENTION_LOCATION_VALUE) {
    return otherLocation || null;
  }

  return preset || otherLocation || null;
}
