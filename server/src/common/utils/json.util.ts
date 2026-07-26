export function safeStringify(value: unknown, pretty: boolean = false): string {
  try {
    return pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}
