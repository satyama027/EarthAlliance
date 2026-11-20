import { parseSave, serializeSave, type ParseResult, type SaveGame } from './saveGame.js';

/** e.g. `earth-alliance-2035-turn-2.json` — named after where the game stands. */
export function saveFileName(save: SaveGame): string {
  const latest = save.turnLog[save.turnLog.length - 1]!;
  return `earth-alliance-${latest.year}-turn-${latest.turn}.json`;
}

/**
 * Export a save as a downloaded `.json` file — the escape hatch for browser storage
 * eviction and for moving a game between devices (ADR-0001).
 */
export function downloadSave(save: SaveGame, doc: Document = document): void {
  const blob = new Blob([serializeSave(save)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = url;
  a.download = saveFileName(save);
  a.style.display = 'none';
  doc.body.appendChild(a);
  try {
    a.click();
  } finally {
    a.remove();
    URL.revokeObjectURL(url);
  }
}

/** Read a player-chosen file (e.g. from `<input type="file">`) and validate it. */
export async function readSaveFile(file: Blob): Promise<ParseResult> {
  return parseSave(await file.text());
}
