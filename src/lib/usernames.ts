export function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/[._-]{2,}/g, ".")
    .replace(/^[._-]+|[._-]+$/g, "");
}

export function buildUsernameCandidate({
  firstName,
  lastName,
  email,
}: {
  firstName: string;
  lastName: string;
  email?: string | null;
}) {
  const emailPrefix = email?.split("@")[0] ?? "";
  const candidate = emailPrefix || `${firstName}.${lastName}`;

  return normalizeUsername(candidate) || "utilisateur";
}

export function isValidUsername(username: string) {
  return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(username);
}
