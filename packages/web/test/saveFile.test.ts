import { createInitialState, advanceTurn } from '@earth-alliance/engine';
import { createSave, serializeSave, type SaveGame } from '../src/save/saveGame.js';
import { saveFileName, downloadSave, readSaveFile } from '../src/save/saveFile.js';

function saveAfter(turns: number): SaveGame {
  let state = createInitialState();
  const turnLog = [{ turn: state.turn, year: state.year, state, diagnostics: null as never }];
  const moves = [];
  for (let i = 0; i < turns; i++) {
    const r = advanceTurn(state, [], []);
    state = r.state;
    turnLog.push({ turn: state.turn, year: state.year, state, diagnostics: r.diagnostics as never });
    moves.push({ selections: [], cancellations: [] });
  }
  return createSave({ turnLog, moves }, { appVersion: 'test', now: new Date('2026-11-20T00:00:00Z') });
}

describe('saveFileName', () => {
  it('names the file after the in-game year and turn', () => {
    expect(saveFileName(saveAfter(2))).toBe('earth-alliance-2035-turn-2.json');
  });
});

describe('downloadSave', () => {
  afterEach(() => vi.restoreAllMocks());

  it('downloads the save as a JSON file and releases the object URL', async () => {
    const save = saveAfter(1);
    let blob: Blob | undefined;
    const createObjectURL = vi.fn((b: Blob) => { blob = b; return 'blob:save'; });
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.href).toBe('blob:save');
      expect(this.download).toBe('earth-alliance-2030-turn-1.json');
    });

    downloadSave(save);

    expect(click).toHaveBeenCalledOnce();
    expect(blob!.type).toBe('application/json');
    expect(await blob!.text()).toBe(serializeSave(save));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:save');
    expect(document.querySelector('a[download]')).toBeNull(); // no stray anchor left behind
  });
});

describe('readSaveFile', () => {
  it('reads an exported file back into the same save', async () => {
    const save = saveAfter(2);
    const file = new File([serializeSave(save)], 'game.json', { type: 'application/json' });
    const result = await readSaveFile(file);
    expect(result).toEqual({ ok: true, save: JSON.parse(serializeSave(save)) });
  });

  it('explains why a file is not a usable save', async () => {
    const file = new File(['<html>oops</html>'], 'game.json');
    expect(await readSaveFile(file)).toEqual({ ok: false, reason: expect.stringMatching(/not valid JSON/i) });
  });
});
