import { Injectable, signal, computed } from '@angular/core';
import { Cartella, Room, WinType } from '../models/tombola.models';

export type UserRole = 'bank' | 'player' | null;

const STORAGE_KEY = 'tombola_session';

interface StoredSession {
  role: UserRole;
  roomId: string | null;
  playerId: string | null;
  playerName: string | null;
}

@Injectable({ providedIn: 'root' })
export class GameSessionService {
  readonly role = signal<UserRole>(null);
  readonly room = signal<Room | null>(null);
  readonly cartella = signal<Cartella | null>(null);
  readonly playerId = signal<string | null>(null);
  readonly playerName = signal<string | null>(null);

  readonly roomId = computed(() => this.room()?.id ?? null);
  readonly isBank = computed(() => this.role() === 'bank');
  readonly isPlayer = computed(() => this.role() === 'player');
  readonly gameStatus = computed(() => this.room()?.status ?? null);
  readonly extractedNumbers = computed(() => this.room()?.extractedNumbers ?? []);

  constructor() {
    this.restoreSession();
  }

  setBankSession(room: Room): void {
    this.role.set('bank');
    this.room.set(room);
    this.cartella.set(null);
    this.playerId.set(null);
    this.playerName.set(null);
    this.persist();
  }

  setPlayerSession(room: Room, cartella: Cartella, playerId: string, playerName: string): void {
    this.role.set('player');
    this.room.set(room);
    this.cartella.set(cartella);
    this.playerId.set(playerId);
    this.playerName.set(playerName);
    this.persist();
  }

  updateRoom(room: Room): void {
    this.room.set(room);
    this.persist();
  }

  clearSession(): void {
    this.role.set(null);
    this.room.set(null);
    this.cartella.set(null);
    this.playerId.set(null);
    this.playerName.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  getStoredSession(): StoredSession | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredSession;
    } catch {
      return null;
    }
  }

  isNumberExtracted(num: number): boolean {
    return this.extractedNumbers().includes(num);
  }

  canClaimWinType(winType: WinType): boolean {
    const room = this.room();
    if (!room) return false;
    return !room.claimedWins.some((w) => w.type === winType);
  }

  private restoreSession(): void {
    const stored = this.getStoredSession();
    if (!stored) return;
    this.role.set(stored.role);
    this.playerId.set(stored.playerId);
    this.playerName.set(stored.playerName);
  }

  private persist(): void {
    const data: StoredSession = {
      role: this.role(),
      roomId: this.room()?.id ?? null,
      playerId: this.playerId(),
      playerName: this.playerName(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}
