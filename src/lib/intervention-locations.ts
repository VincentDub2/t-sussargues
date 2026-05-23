export const OTHER_INTERVENTION_LOCATION_VALUE = "__other";

export const PREDEFINED_INTERVENTION_LOCATIONS = [
  "Foyer communal",
  "Mairie",
  "Ecole maternelle",
  "Ecole elementaire",
  "Salle polyvalente",
  "Stade municipal",
  "Ateliers municipaux",
] as const;

export function parseInterventionLocation(formData: FormData) {
  const preset = String(formData.get("locationPreset") ?? "").trim();
  const otherLocation = String(formData.get("locationOther") ?? "").trim();

  if (preset === OTHER_INTERVENTION_LOCATION_VALUE) {
    return otherLocation || null;
  }

  if ((PREDEFINED_INTERVENTION_LOCATIONS as readonly string[]).includes(preset)) {
    return preset;
  }

  return otherLocation || null;
}
