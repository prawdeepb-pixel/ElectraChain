import { createSeedDatabase, normalizeDatabase, STORAGE_KEY } from "./seedData";

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadLocalDatabase() {
  if (!hasLocalStorage()) {
    return createSeedDatabase();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = createSeedDatabase();
    saveLocalDatabase(seed);
    return seed;
  }

  try {
    return normalizeDatabase(JSON.parse(raw));
  } catch {
    const seed = createSeedDatabase();
    saveLocalDatabase(seed);
    return seed;
  }
}

export function saveLocalDatabase(db) {
  if (!hasLocalStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeDatabase(db)));
}

export function resetLocalDatabase() {
  const seed = createSeedDatabase();
  saveLocalDatabase(seed);
  return seed;
}
