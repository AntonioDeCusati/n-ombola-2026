export type GameStatus = 'waiting' | 'playing' | 'paused' | 'finished';

export type WinType = 'ambo' | 'terna' | 'quaterna' | 'cinquina' | 'tombola';

export interface Cartella {
  id: number;
  grid: (number | null)[][];
  numbers: number[];
}

export interface Player {
  id: string;
  name: string;
  cartellaId: number;
  joinedAt: number;
}

export interface WinClaim {
  type: WinType;
  playerId: string;
  playerName: string;
  row: number | null;
  claimedAt: number;
  confirmedAt?: number;
}

export interface Room {
  id: string;
  status: GameStatus;
  extractedNumbers: number[];
  players: Player[];
  pendingWinClaim: WinClaim | null;
  claimedWins: WinClaim[];
  playerCount: number;
  createdAt: number;
  startedAt: number | null;
  lastExtractionAt: number | null;
  debounceMs: number;
}

export interface SocketResponse<T = unknown> {
  success: boolean;
  error?: string;
  message?: string;
  waitMs?: number;
  room?: Room;
  cartella?: Cartella;
  playerId?: string;
  claim?: WinClaim;
  number?: number;
  extractedNumbers?: number[];
  totalExtracted?: number;
  data?: T;
}

export interface NumberExtractedEvent {
  number: number;
  extractedNumbers: number[];
  totalExtracted: number;
}

export interface WinClaimedEvent {
  claim: WinClaim;
  room: Room;
}

export interface PlayerJoinedEvent {
  player: Player;
  room: Room;
}
