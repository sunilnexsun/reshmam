// The admin store keeps its data in localStorage and saves 120 ms after each change. Node has no
// localStorage, so that save would fail (and its error path touches `window`) whenever a test file runs
// longer than the delay. Tests get a simple in-memory one instead, which also lets them check saving.
class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length() {
    return this.items.size;
  }
  key(i: number) {
    return [...this.items.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.items.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.items.set(k, String(v));
  }
  removeItem(k: string) {
    this.items.delete(k);
  }
  clear() {
    this.items.clear();
  }
}

if (typeof globalThis.localStorage === "undefined") {
  Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), configurable: true });
}
