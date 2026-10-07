import { v4 as uuidv4 } from 'uuid';
import { getCartellaById, getCartellaCount } from './cartellaService.js';
import { validateWin, getWinTypes } from './winValidator.js';

const rooms = new Map();
const EXTRACTION_DEBOUNCE_MS = 2500;

function generateRoomCode() {
  let code;
  do {
    code = String(Math.floor(1000 + Math.random() * 9000));
  } while (rooms.has(code));
  return code;
}

function createRoomState(roomId) {
  return {
    id: roomId,
    status: 'waiting', // waiting | playing | paused | finished
    bankSocketId: null,
    extractedNumbers: [],
    assignedCartelle: new Map(), // playerId -> cartellaId
    players: new Map(), // playerId -> { id, name, socketId, cartellaId, joinedAt }
    pendingWinClaim: null,
    claimedWins: [], // { type, playerId, playerName, row, numberAtWin, timestamp }
    createdAt: Date.now(),
    startedAt: null,
    lastExtractionAt: null,
  };
}

export function createRoom(bankSocketId) {
  const roomId = generateRoomCode();
  const room = createRoomState(roomId);
  room.bankSocketId = bankSocketId;
  rooms.set(roomId, room);
  return serializeRoom(room);
}

export function getRoom(roomId) {
  const room = rooms.get(roomId);
  return room ? serializeRoom(room) : null;
}

export function getRoomInternal(roomId) {
  return rooms.get(roomId) ?? null;
}

export function deleteRoom(roomId) {
  return rooms.delete(roomId);
}

export function joinRoom(roomId, playerName, socketId) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'ROOM_NOT_FOUND', message: 'Stanza non trovata' };
  if (room.status === 'finished') return { error: 'GAME_FINISHED', message: 'Partita terminata' };

  const usedCartelle = new Set(room.assignedCartelle.values());
  const available = [];
  for (let i = 1; i <= getCartellaCount(); i++) {
    if (!usedCartelle.has(i)) available.push(i);
  }

  if (available.length === 0) {
    return { error: 'NO_CARTELLE', message: 'Nessuna cartella disponibile' };
  }

  const cartellaId = available[Math.floor(Math.random() * available.length)];
  const playerId = uuidv4();
  const cartella = getCartellaById(cartellaId);

  room.assignedCartelle.set(playerId, cartellaId);
  room.players.set(playerId, {
    id: playerId,
    name: playerName || `Giocatore ${room.players.size + 1}`,
    socketId,
    cartellaId,
    joinedAt: Date.now(),
  });

  return {
    playerId,
    room: serializeRoom(room),
    cartella,
  };
}

export function startGame(roomId) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'ROOM_NOT_FOUND' };
  if (room.status !== 'waiting') return { error: 'INVALID_STATE', message: 'La partita è già iniziata' };
  if (room.players.size === 0) return { error: 'NO_PLAYERS', message: 'Nessun giocatore in stanza' };

  room.status = 'playing';
  room.startedAt = Date.now();
  return { room: serializeRoom(room) };
}

export function canExtract(roomId) {
  const room = rooms.get(roomId);
  if (!room) return { allowed: false, error: 'ROOM_NOT_FOUND' };
  if (room.status !== 'playing') return { allowed: false, error: 'NOT_PLAYING' };
  if (room.pendingWinClaim) return { allowed: false, error: 'PENDING_WIN', message: 'Vincita in attesa di verifica' };

  const now = Date.now();
  if (room.lastExtractionAt && now - room.lastExtractionAt < EXTRACTION_DEBOUNCE_MS) {
    const waitMs = EXTRACTION_DEBOUNCE_MS - (now - room.lastExtractionAt);
    return { allowed: false, error: 'DEBOUNCE', waitMs };
  }

  if (room.extractedNumbers.length >= 90) {
    return { allowed: false, error: 'ALL_EXTRACTED' };
  }

  return { allowed: true };
}

export function extractNumber(roomId) {
  const check = canExtract(roomId);
  if (!check.allowed) return check;

  const room = rooms.get(roomId);
  const available = [];
  for (let n = 1; n <= 90; n++) {
    if (!room.extractedNumbers.includes(n)) available.push(n);
  }

  const number = available[Math.floor(Math.random() * available.length)];
  room.extractedNumbers.push(number);
  room.lastExtractionAt = Date.now();

  return {
    number,
    extractedNumbers: [...room.extractedNumbers],
    totalExtracted: room.extractedNumbers.length,
  };
}

export function claimWin(roomId, playerId, winType) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'ROOM_NOT_FOUND' };
  if (room.status !== 'playing' && room.status !== 'paused') {
    return { error: 'INVALID_STATE', message: 'Partita non in corso' };
  }

  const player = room.players.get(playerId);
  if (!player) return { error: 'PLAYER_NOT_FOUND' };

  const validTypes = getWinTypes();
  if (!validTypes.includes(winType)) {
    return { error: 'INVALID_WIN_TYPE', message: 'Tipo vincita non valido' };
  }

  const cartella = getCartellaById(player.cartellaId);
  const result = validateWin(cartella, room.extractedNumbers, winType);

  if (!result.valid) {
    return { error: 'INVALID_CLAIM', message: 'Vincita non valida' };
  }

  // Verifica che non sia già stata reclamata questa vincita
  const alreadyClaimed = room.claimedWins.some((w) => w.type === winType);
  if (alreadyClaimed) {
    return { error: 'ALREADY_CLAIMED', message: `${winType} già assegnato` };
  }

  room.status = 'paused';
  room.pendingWinClaim = {
    type: winType,
    playerId,
    playerName: player.name,
    row: result.row,
    claimedAt: Date.now(),
  };

  return {
    claim: room.pendingWinClaim,
    room: serializeRoom(room),
  };
}

export function confirmWin(roomId) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'ROOM_NOT_FOUND' };
  if (!room.pendingWinClaim) return { error: 'NO_PENDING_CLAIM' };

  const claim = { ...room.pendingWinClaim, confirmedAt: Date.now() };
  room.claimedWins.push(claim);
  room.pendingWinClaim = null;

  if (claim.type === 'tombola') {
    room.status = 'finished';
  } else {
    room.status = 'playing';
  }

  return { claim, room: serializeRoom(room) };
}

export function rejectWin(roomId) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'ROOM_NOT_FOUND' };
  if (!room.pendingWinClaim) return { error: 'NO_PENDING_CLAIM' };

  const rejected = room.pendingWinClaim;
  room.pendingWinClaim = null;
  room.status = 'playing';

  return { rejected, room: serializeRoom(room) };
}

export function removePlayer(roomId, playerId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.players.delete(playerId);
  room.assignedCartelle.delete(playerId);
}

export function removePlayerBySocket(socketId) {
  for (const [roomId, room] of rooms) {
    for (const [playerId, player] of room.players) {
      if (player.socketId === socketId) {
        removePlayer(roomId, playerId);
        return { roomId, playerId, room: serializeRoom(room) };
      }
    }
    if (room.bankSocketId === socketId) {
      room.bankSocketId = null;
      return { roomId, isBank: true, room: serializeRoom(room) };
    }
  }
  return null;
}

export function updatePlayerSocket(roomId, playerId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return false;
  const player = room.players.get(playerId);
  if (!player) return false;
  player.socketId = socketId;
  return true;
}

function serializeRoom(room) {
  return {
    id: room.id,
    status: room.status,
    extractedNumbers: [...room.extractedNumbers],
    players: Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      cartellaId: p.cartellaId,
      joinedAt: p.joinedAt,
    })),
    pendingWinClaim: room.pendingWinClaim ? { ...room.pendingWinClaim } : null,
    claimedWins: [...room.claimedWins],
    playerCount: room.players.size,
    createdAt: room.createdAt,
    startedAt: room.startedAt,
    lastExtractionAt: room.lastExtractionAt,
    debounceMs: EXTRACTION_DEBOUNCE_MS,
  };
}

export { EXTRACTION_DEBOUNCE_MS };
