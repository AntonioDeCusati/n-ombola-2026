import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cartelle = JSON.parse(
  readFileSync(join(__dirname, '../data/cartelle.json'), 'utf-8')
);

export function getAllCartelle() {
  return cartelle;
}

export function getCartellaById(id) {
  return cartelle.find((c) => c.id === id) ?? null;
}

export function getCartellaCount() {
  return cartelle.length;
}
