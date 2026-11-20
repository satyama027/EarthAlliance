import '@testing-library/jest-dom/vitest';
// In-memory IndexedDB (jsdom has none) so the browser SaveStore adapter and the
// App's autosave run against a real IndexedDB API in tests.
import 'fake-indexeddb/auto';
import { vi } from 'vitest';

// Browser shims below apply only under jsdom; a few suites (e.g. the production-build
// check) opt into `@vitest-environment node`, where there is no `window`.
if (typeof window !== 'undefined') {
  // jsdom does not implement matchMedia; Mantine's MantineProvider requires it.
  // https://mantine.dev/guides/vitest/
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // jsdom lacks ResizeObserver, which some Mantine components rely on.
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = window.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

  // jsdom's Blob/File lack `.text()` (every target browser has it); back it with FileReader.
  if (!Blob.prototype.text) {
    Blob.prototype.text = function text(this: Blob) {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(this);
      });
    };
  }
}
