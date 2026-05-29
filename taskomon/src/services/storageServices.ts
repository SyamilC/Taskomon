export function saveToStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);

  if (!saved) return fallback;

  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

export function removeFromStorage(key: string): void {
  localStorage.removeItem(key);
}