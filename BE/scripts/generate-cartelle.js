/**
 * Genera 50 cartelle tombola valide secondo le regole ufficiali:
 * - 3 righe × 9 colonne
 * - 5 numeri per riga (15 totali)
 * - Colonna i: numeri da (i===0 ? 1 : i*10) a (i===0 ? 9 : i*10+9)
 * - Ogni colonna ha 1-3 numeri
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickSorted(count, min, max) {
  const pool = [];
  for (let n = min; n <= max; n++) pool.push(n);
  return shuffle(pool).slice(0, count).sort((a, b) => a - b);
}

function distributeColumnCounts() {
  // Ogni colonna 1-3 numeri, totale 15
  const counts = Array(9).fill(1);
  let remaining = 15 - 9; // 6 da distribuire
  while (remaining > 0) {
    const col = Math.floor(Math.random() * 9);
    if (counts[col] < 3) {
      counts[col]++;
      remaining--;
    }
  }
  return counts;
}

function assignRows(colCounts) {
  const rowCounts = [0, 0, 0];
  const assignments = [];

  for (let col = 0; col < 9; col++) {
    const available = [0, 1, 2].filter((r) => rowCounts[r] < 5);
    const rows = shuffle(available).slice(0, colCounts[col]);
    rows.forEach((r) => rowCounts[r]++);
    assignments.push(rows.sort((a, b) => a - b));
  }

  if (rowCounts.some((c) => c !== 5)) return null;
  return assignments;
}

function generateCartella(id) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const colCounts = distributeColumnCounts();
    const rowAssignments = assignRows(colCounts);
    if (!rowAssignments) continue;

    const grid = Array.from({ length: 3 }, () => Array(9).fill(null));
    let valid = true;

    for (let col = 0; col < 9; col++) {
      const min = col === 0 ? 1 : col * 10;
      const max = col === 0 ? 9 : col * 10 + 9;
      const nums = pickSorted(colCounts[col], min, max);
      rowAssignments[col].forEach((row, i) => {
        grid[row][col] = nums[i];
      });
    }

    const allNumbers = grid.flat().filter((n) => n !== null);
    if (allNumbers.length === 15 && new Set(allNumbers).size === 15) {
      return { id, grid, numbers: allNumbers.sort((a, b) => a - b) };
    }
  }
  throw new Error(`Impossibile generare cartella ${id}`);
}

function generateUniqueCartelle(count) {
  const cartelle = [];
  const seen = new Set();

  while (cartelle.length < count) {
    const cartella = generateCartella(cartelle.length + 1);
    const key = cartella.numbers.join(',');
    if (!seen.has(key)) {
      seen.add(key);
      cartelle.push(cartella);
    }
  }
  return cartelle;
}

const cartelle = generateUniqueCartelle(50);
const outputPath = join(__dirname, '../src/data/cartelle.json');
writeFileSync(outputPath, JSON.stringify(cartelle, null, 2));
console.log(`Generate ${cartelle.length} cartelle in ${outputPath}`);
