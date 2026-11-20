import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { vi } from 'vitest';
import App from '../src/App.js';
import { createMemorySaveStore } from '../src/platform/memory.js';
import type { Platform } from '../src/platform/types.js';
import { AUTOSAVE_SLOT, readSave } from '../src/save/saveGame.js';

vi.mock('../src/scene/WorldMap.js', () => ({
  WorldMap: () => <div data-testid="world-map-stub" />,
}));

describe('App autosave (ADR-0001)', () => {
  it("autosaves the game to the platform's save store after End Turn", async () => {
    const platform: Platform = { kind: 'web', saves: createMemorySaveStore(), exportSave: vi.fn() };
    render(<MantineProvider><App platform={platform} /></MantineProvider>);
    expect(await platform.saves.read(AUTOSAVE_SLOT)).toBeUndefined();

    await userEvent.click(screen.getByRole('button', { name: /end turn/i }));

    await vi.waitFor(async () => {
      const read = await readSave(platform.saves, AUTOSAVE_SLOT);
      if (!read?.ok) throw new Error('no valid autosave yet');
      expect(read.save.turnLog.at(-1)!.year).toBe(2030);
    });
  });
});
