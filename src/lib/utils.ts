
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeJsonParse<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    // console.warn(`safeJsonParse (${key}): localStorage not available (SSR or non-browser). Returning default.`);
    return defaultValue;
  }
  try {
    const item = localStorage.getItem(key);
    if (item === null || item === undefined) {
      // console.warn(`safeJsonParse (${key}): Item not found in localStorage. Returning default.`);
      return defaultValue;
    }
    const parsed = JSON.parse(item);

    // Basic type check for arrays
    if (Array.isArray(defaultValue) && !Array.isArray(parsed)) {
      console.warn(`safeJsonParse (${key}): Data in localStorage for key '${key}' was not an array as expected. Returning default.`);
      return defaultValue;
    }
    // Basic type check for objects (excluding arrays and null)
    if (typeof defaultValue === 'object' && defaultValue !== null && !Array.isArray(defaultValue) &&
        (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))) {
      console.warn(`safeJsonParse (${key}): Data in localStorage for key '${key}' was not an object as expected. Returning default.`);
      return defaultValue;
    }

    return parsed as T;
  } catch (error) {
    console.warn(`safeJsonParse (${key}): Error parsing JSON from localStorage for key '${key}'. Error:`, error, `. Returning default.`);
    return defaultValue;
  }
}
