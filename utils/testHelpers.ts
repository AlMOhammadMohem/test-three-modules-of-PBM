/**
 * Small shared helpers used across test specs and page objects.
 */

export async function retry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 1000): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i < attempts; i++) {
          try {
                  return await fn();
          } catch (err) {
                  lastError = err;
                  await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
    }
    throw lastError;
}

export function randomSuffix(length = 6): string {
    return Math.random().toString(36).substring(2, 2 + length);
}

export function isActiveStatus(status: string): boolean {
    return status.trim().toLowerCase() === 'active';
}

export function isDraftStatus(status: string): boolean {
    return status.toLowerCase().includes('draft');
}

export function isPendingStatus(status: string): boolean {
    return status.toLowerCase().includes('pending');
}
