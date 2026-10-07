/**
 * Valida le vincite tombola:
 * - ambo: 2 numeri sulla stessa riga
 * - terna: 3 numeri sulla stessa riga
 * - quaterna: 4 numeri sulla stessa riga
 * - cinquina: 5 numeri sulla stessa riga
 * - tombola: tutti i 15 numeri
 */

const WIN_THRESHOLDS = {
  ambo: 2,
  terna: 3,
  quaterna: 4,
  cinquina: 5,
  tombola: 15,
};

export function validateWin(cartella, extractedNumbers, winType) {
  const extracted = new Set(extractedNumbers);
  const grid = cartella.grid;

  if (winType === 'tombola') {
    const allMatched = cartella.numbers.every((n) => extracted.has(n));
    return { valid: allMatched, row: null };
  }

  const threshold = WIN_THRESHOLDS[winType];
  if (!threshold || threshold > 5) {
    return { valid: false, row: null, error: 'Tipo vincita non valido' };
  }

  for (let row = 0; row < 3; row++) {
    const rowNumbers = grid[row].filter((n) => n !== null);
    const matched = rowNumbers.filter((n) => extracted.has(n)).length;
    if (matched >= threshold) {
      return { valid: true, row };
    }
  }

  return { valid: false, row: null };
}

export function getWinTypes() {
  return Object.keys(WIN_THRESHOLDS);
}

export function getHighestWinOnRow(cartella, extractedNumbers, row) {
  const extracted = new Set(extractedNumbers);
  const rowNumbers = cartella.grid[row].filter((n) => n !== null);
  const matched = rowNumbers.filter((n) => extracted.has(n)).length;

  if (matched >= 5) return 'cinquina';
  if (matched >= 4) return 'quaterna';
  if (matched >= 3) return 'terna';
  if (matched >= 2) return 'ambo';
  return null;
}
