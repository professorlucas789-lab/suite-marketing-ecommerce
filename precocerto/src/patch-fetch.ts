// Sandboxed iframes or browser security wrappers sometimes define window.fetch as a read-only property with a getter only.
// Any library (like formdata-polyfill or others) that tries to assign or polyfill global fetch with `window.fetch = ...`
// or `globalThis.fetch = ...` will fail with "Uncaught TypeError: Cannot set property fetch of #<Window> which has only a getter".
// This script runs before all other modules and overrides the fetch property descriptors to make them writable and configurable.
// It also ensures FormData has keys/values/entries on its prototype so that formdata-polyfill is not triggered unnecessarily.

try {
  const globalObj = typeof globalThis !== 'undefined' 
    ? globalThis 
    : typeof window !== 'undefined' 
      ? window 
      : typeof self !== 'undefined' 
        ? self 
        : {} as any;

  // 1. Pre-emptively ensure FormData and its prototype are fully standard-compliant.
  // This prevents formdata-polyfill from executing and trying to overwrite window.fetch.
  if (typeof globalObj !== 'undefined') {
    if (typeof globalObj.FormData === 'undefined') {
      // Create a standard-compliant FormData stub so that formdata-polyfill avoids running.
      globalObj.FormData = class FormData {
        private _data: [string, any][] = [];
        append(key: string, value: any) { this._data.push([key, value]); }
        delete(key: string) { this._data = this._data.filter(([k]) => k !== key); }
        get(key: string) { const found = this._data.find(([k]) => k === key); return found ? found[1] : null; }
        getAll(key: string) { return this._data.filter(([k]) => k === key).map(([, v]) => v); }
        has(key: string) { return this._data.some(([k]) => k === key); }
        set(key: string, value: any) {
          this.delete(key);
          this.append(key, value);
        }
        forEach(callback: (value: any, key: string, parent: any) => void, thisArg?: any) {
          this._data.forEach(([k, v]) => callback.call(thisArg, v, k, this));
        }
        *keys() { for (const [k] of this._data) yield k; }
        *values() { for (const [, v] of this._data) yield v; }
        *entries() { for (const entry of this._data) yield entry; }
        [Symbol.iterator]() { return this.entries(); }
      };
    } else {
      // FormData exists, ensure its prototype has the keys, values, entries methods
      const proto = globalObj.FormData.prototype;
      if (proto) {
        if (!proto.keys) {
          proto.keys = function* (this: any) { yield* []; };
        }
        if (!proto.values) {
          proto.values = function* (this: any) { yield* []; };
        }
        if (!proto.entries) {
          proto.entries = function* (this: any) { yield* []; };
        }
        if (!proto[Symbol.iterator]) {
          proto[Symbol.iterator] = function (this: any) { return this.entries(); };
        }
      }
    }
  }

  // 2. Try to redefine fetch to make it writable
  const originalFetch = globalObj.fetch;

  if (originalFetch) {
    let currentFetch = originalFetch;

    // We define a getter and setter so that assigning to globalObj.fetch or window.fetch will update our internal currentFetch variable.
    const descriptor: PropertyDescriptor = {
      get() {
        return currentFetch;
      },
      set(val) {
        currentFetch = val;
      },
      configurable: true,
      enumerable: true
    };

    // Try defining on globalThis/globalObj
    try {
      Object.defineProperty(globalObj, 'fetch', descriptor);
    } catch (e) {
      console.warn("Could not redefine fetch on globalObj directly:", e);
    }

    // Try defining on window if window is distinct
    if (typeof window !== 'undefined' && (window as any) !== globalObj) {
      try {
        Object.defineProperty(window, 'fetch', descriptor);
      } catch (e) {
        console.warn("Could not redefine fetch on window:", e);
      }
    }

    // Try defining on Window.prototype if it exists
    if (typeof Window !== 'undefined' && Window.prototype) {
      try {
        Object.defineProperty(Window.prototype, 'fetch', descriptor);
      } catch (e) {
        // Safe to ignore if non-configurable
      }
    }
  }
} catch (e) {
  console.error("Failed to patch fetch descriptor:", e);
}

export {};
