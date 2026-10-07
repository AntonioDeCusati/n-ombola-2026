import {
  createRoom,
  getRoom,
  getRoomInternal,
  joinRoom,
  startGame,
  extractNumber,
  claimWin,
  confirmWin,
  rejectWin,
  removePlayerBySocket,
  updatePlayerSocket,
  canExtract,
} from '../services/roomService.js';
import { getCartellaById } from '../services/cartellaService.js';
import { getAck, getData } from './utils.js';

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[socket] connesso: ${socket.id}`);

    socket.on('bank:create-room', (...args) => {
      const callback = getAck(args);
      const room = createRoom(socket.id);
      socket.join(`room:${room.id}`);
      socket.data.role = 'bank';
      socket.data.roomId = room.id;
      console.log(`[room] creata stanza ${room.id} da banco ${socket.id}`);
      callback?.({ success: true, room });
    });

    socket.on('bank:rejoin-room', (...args) => {
      const callback = getAck(args);
      const { roomId } = getData(args) ?? {};
      const room = getRoomInternal(roomId);
      if (!room) {
        return callback?.({ success: false, error: 'ROOM_NOT_FOUND' });
      }
      room.bankSocketId = socket.id;
      socket.join(`room:${roomId}`);
      socket.data.role = 'bank';
      socket.data.roomId = roomId;
      callback?.({ success: true, room: getRoom(roomId) });
    });

    socket.on('player:join-room', (...args) => {
      const callback = getAck(args);
      const { roomId, playerName, playerId } = getData(args) ?? {};

      if (playerId) {
        const room = getRoomInternal(roomId);
        if (room && updatePlayerSocket(roomId, playerId, socket.id)) {
          socket.join(`room:${roomId}`);
          socket.data.role = 'player';
          socket.data.roomId = roomId;
          socket.data.playerId = playerId;
          const player = room.players.get(playerId);
          const cartella = getCartellaById(player.cartellaId);
          return callback?.({ success: true, playerId, room: getRoom(roomId), cartella });
        }
      }

      const result = joinRoom(roomId, playerName, socket.id);
      if (result.error) {
        return callback?.({ success: false, error: result.error, message: result.message });
      }

      socket.join(`room:${roomId}`);
      socket.data.role = 'player';
      socket.data.roomId = roomId;
      socket.data.playerId = result.playerId;

      io.to(`room:${roomId}`).emit('room:player-joined', {
        player: result.room.players.find((p) => p.id === result.playerId),
        room: result.room,
      });

      console.log(`[room] ${result.playerId} entrato in ${roomId}`);
      callback?.({ success: true, playerId: result.playerId, room: result.room, cartella: result.cartella });
    });

    socket.on('bank:start-game', (...args) => {
      const callback = getAck(args);
      const { roomId } = getData(args) ?? {};
      const result = startGame(roomId);
      if (result.error) {
        return callback?.({ success: false, error: result.error, message: result.message });
      }
      io.to(`room:${roomId}`).emit('game:started', { room: result.room });
      console.log(`[game] partita iniziata in ${roomId}`);
      callback?.({ success: true, room: result.room });
    });

    socket.on('bank:extract-number', (...args) => {
      const callback = getAck(args);
      const { roomId } = getData(args) ?? {};
      const check = canExtract(roomId);
      if (!check.allowed) {
        return callback?.({ success: false, error: check.error, waitMs: check.waitMs, message: check.message });
      }

      const result = extractNumber(roomId);
      if (result.error) {
        return callback?.({ success: false, error: result.error });
      }

      io.to(`room:${roomId}`).emit('game:number-extracted', {
        number: result.number,
        extractedNumbers: result.extractedNumbers,
        totalExtracted: result.totalExtracted,
      });

      console.log(`[game] estratto ${result.number} in ${roomId}`);
      callback?.({ success: true, ...result });
    });

    socket.on('player:claim-win', (...args) => {
      const callback = getAck(args);
      const { roomId, playerId, winType } = getData(args) ?? {};
      const result = claimWin(roomId, playerId, winType);
      if (result.error) {
        return callback?.({ success: false, error: result.error, message: result.message });
      }

      io.to(`room:${roomId}`).emit('game:win-claimed', {
        claim: result.claim,
        room: result.room,
      });

      console.log(`[game] ${playerId} reclama ${winType} in ${roomId}`);
      callback?.({ success: true, claim: result.claim, room: result.room });
    });

    socket.on('bank:confirm-win', (...args) => {
      const callback = getAck(args);
      const { roomId } = getData(args) ?? {};
      const result = confirmWin(roomId);
      if (result.error) {
        return callback?.({ success: false, error: result.error });
      }

      io.to(`room:${roomId}`).emit('game:win-confirmed', {
        claim: result.claim,
        room: result.room,
      });

      if (result.room.status === 'finished') {
        io.to(`room:${roomId}`).emit('game:finished', { room: result.room });
      }

      callback?.({ success: true, claim: result.claim, room: result.room });
    });

    socket.on('bank:reject-win', (...args) => {
      const callback = getAck(args);
      const { roomId } = getData(args) ?? {};
      const result = rejectWin(roomId);
      if (result.error) {
        return callback?.({ success: false, error: result.error });
      }

      io.to(`room:${roomId}`).emit('game:win-rejected', {
        rejected: result.rejected,
        room: result.room,
      });

      callback?.({ success: true, room: result.room });
    });

    socket.on('room:get-state', (...args) => {
      const callback = getAck(args);
      const { roomId } = getData(args) ?? {};
      const room = getRoom(roomId);
      if (!room) {
        return callback?.({ success: false, error: 'ROOM_NOT_FOUND' });
      }
      callback?.({ success: true, room });
    });

    socket.on('disconnect', () => {
      const info = removePlayerBySocket(socket.id);
      if (info) {
        if (info.isBank) {
          io.to(`room:${info.roomId}`).emit('bank:disconnected', { room: info.room });
          console.log(`[room] banco disconnesso da ${info.roomId}`);
        } else if (info.playerId) {
          io.to(`room:${info.roomId}`).emit('room:player-left', {
            playerId: info.playerId,
            room: info.room,
          });
          console.log(`[room] giocatore ${info.playerId} uscito da ${info.roomId}`);
        }
      }
    });
  });
}
