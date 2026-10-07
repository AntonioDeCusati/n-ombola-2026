import { Injectable, inject, NgZone, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Cartella,
  NumberExtractedEvent,
  PlayerJoinedEvent,
  Room,
  SocketResponse,
  WinClaim,
  WinClaimedEvent,
  WinType,
} from '../models/tombola.models';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private readonly ngZone = inject(NgZone);
  private socket: Socket | null = null;

  private readonly numberExtracted$ = new Subject<NumberExtractedEvent>();
  private readonly gameStarted$ = new Subject<{ room: Room }>();
  private readonly gameFinished$ = new Subject<{ room: Room }>();
  private readonly winClaimed$ = new Subject<WinClaimedEvent>();
  private readonly winConfirmed$ = new Subject<{ claim: WinClaim; room: Room }>();
  private readonly winRejected$ = new Subject<{ rejected: WinClaim; room: Room }>();
  private readonly playerJoined$ = new Subject<PlayerJoinedEvent>();
  private readonly playerLeft$ = new Subject<{ playerId: string; room: Room }>();
  private readonly bankDisconnected$ = new Subject<{ room: Room }>();
  private readonly connectionChanged$ = new Subject<boolean>();

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(environment.wsUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      this.ngZone.run(() => this.connectionChanged$.next(true));
    });

    this.socket.on('disconnect', () => {
      this.ngZone.run(() => this.connectionChanged$.next(false));
    });

    this.registerEventForwarders();
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  onConnectionChanged(): Observable<boolean> {
    return this.connectionChanged$.asObservable();
  }

  onNumberExtracted(): Observable<NumberExtractedEvent> {
    return this.numberExtracted$.asObservable();
  }

  onGameStarted(): Observable<{ room: Room }> {
    return this.gameStarted$.asObservable();
  }

  onGameFinished(): Observable<{ room: Room }> {
    return this.gameFinished$.asObservable();
  }

  onWinClaimed(): Observable<WinClaimedEvent> {
    return this.winClaimed$.asObservable();
  }

  onWinConfirmed(): Observable<{ claim: WinClaim; room: Room }> {
    return this.winConfirmed$.asObservable();
  }

  onWinRejected(): Observable<{ rejected: WinClaim; room: Room }> {
    return this.winRejected$.asObservable();
  }

  onPlayerJoined(): Observable<PlayerJoinedEvent> {
    return this.playerJoined$.asObservable();
  }

  onPlayerLeft(): Observable<{ playerId: string; room: Room }> {
    return this.playerLeft$.asObservable();
  }

  onBankDisconnected(): Observable<{ room: Room }> {
    return this.bankDisconnected$.asObservable();
  }

  createRoom(): Promise<SocketResponse> {
    return this.emitWithAck('bank:create-room');
  }

  rejoinBankRoom(roomId: string): Promise<SocketResponse> {
    return this.emitWithAck('bank:rejoin-room', { roomId });
  }

  joinRoom(roomId: string, playerName: string, playerId?: string): Promise<SocketResponse> {
    return this.emitWithAck('player:join-room', { roomId, playerName, playerId });
  }

  startGame(roomId: string): Promise<SocketResponse> {
    return this.emitWithAck('bank:start-game', { roomId });
  }

  extractNumber(roomId: string): Promise<SocketResponse> {
    return this.emitWithAck('bank:extract-number', { roomId });
  }

  claimWin(roomId: string, playerId: string, winType: WinType): Promise<SocketResponse> {
    return this.emitWithAck('player:claim-win', { roomId, playerId, winType });
  }

  confirmWin(roomId: string): Promise<SocketResponse> {
    return this.emitWithAck('bank:confirm-win', { roomId });
  }

  rejectWin(roomId: string): Promise<SocketResponse> {
    return this.emitWithAck('bank:reject-win', { roomId });
  }

  getRoomState(roomId: string): Promise<SocketResponse> {
    return this.emitWithAck('room:get-state', { roomId });
  }

  private registerEventForwarders(): void {
    const forward = <T>(event: string, subject: Subject<T>) => {
      this.socket?.on(event, (data: T) => {
        this.ngZone.run(() => subject.next(data));
      });
    };

    forward('game:number-extracted', this.numberExtracted$);
    forward('game:started', this.gameStarted$);
    forward('game:finished', this.gameFinished$);
    forward('game:win-claimed', this.winClaimed$);
    forward('game:win-confirmed', this.winConfirmed$);
    forward('game:win-rejected', this.winRejected$);
    forward('room:player-joined', this.playerJoined$);
    forward('room:player-left', this.playerLeft$);
    forward('bank:disconnected', this.bankDisconnected$);
  }

  private emitWithAck<T = SocketResponse>(event: string, payload?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket non connesso'));
        return;
      }

      const timeout = setTimeout(() => reject(new Error('Timeout socket')), 10000);

      const onResponse = (response: T) => {
        clearTimeout(timeout);
        this.ngZone.run(() => resolve(response));
      };

      if (payload === undefined) {
        this.socket.emit(event, onResponse);
      } else {
        this.socket.emit(event, payload, onResponse);
      }
    });
  }
}
