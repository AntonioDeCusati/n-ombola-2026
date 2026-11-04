import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { filter, from, switchMap, take, tap } from 'rxjs';
import { GameSessionService } from '../../services/game-session.service';
import { SocketService } from '../../services/socket.service';
import { WinType } from '../../models/tombola.models';
import { toSignal } from '@angular/core/rxjs-interop';


//TODO: Implementare metodi per disabilitiare i pulsanti di quaterna cinquina e tombola in base alle condizioni di vincita
//TODO: implementare la logica per rimanere sempre in ascolto dei numeri che vengono lanciati
//TODO: imlementare la logica per la visualizzazione della verifca della vincita e la conferma o meno da parte del banco
@Component({
  selector: 'app-giocatore',
  standalone: true,
  templateUrl: './giocatore.html',
  styleUrl: './giocatore.scss',
})
export class Giocatore implements OnInit {
  private readonly session = inject(GameSessionService);
  private readonly socket = inject(SocketService);

  protected readonly room = this.session.room;
  protected readonly cartella = this.session.cartella;
  protected readonly extractedNumbers = this.session.extractedNumbers;

  protected playerName = signal('');
  protected roomCode = signal('');

  protected readonly connected = toSignal(this.socket.onConnectionChanged(), {
    initialValue: this.socket.isConnected(),
  });

  protected readonly hasJoined = computed(() => !!this.cartella());

  protected readonly markedCount = computed(() => {
    const cartella = this.cartella();

    if (!cartella) {
      return 0;
    }

    return cartella.numbers.filter((number) =>
      this.session.isNumberExtracted(number),
    ).length;
  });

  protected readonly lastExtractedNumber = computed(
    () => this.extractedNumbers().at(-1) ?? null,
  );

  ngOnInit(): void {
    this.socket.connect();

    const stored = this.session.getStoredSession();

    if (stored?.roomId) {
      from(this.socket.getRoomState(stored.roomId))
        .pipe(
          filter((response) => response.success && !!response.room),
          tap((response) => {
            this.session.updateRoom(response.room!);
          }),
        )
        .subscribe();
    }

    this.listenNumberExtracted();
    this.listenWinConfirmed();
    this.listenWinRejected();
    this.listenGameFinished();
  }

  protected join(): void {
    from(this.socket.joinRoom(this.roomCode(), this.playerName()))
      .pipe(
        filter((response) => response.success),
        tap((response) => {
          this.session.setPlayerSession(
            response.room!,
            response.cartella!,
            response.playerId!,
            this.playerName(),
          );
        }),
      )
      .subscribe();
  }

  protected canClaimWinType(winType: WinType): boolean {
    return this.session.canClaimWinType(winType);
  }

  protected claimWin(winType: WinType): void {
    const roomId = this.session.roomId();
    const playerId = this.session.playerId();

    if (!roomId || !playerId) {
      return;
    }

    from(this.socket.claimWin(roomId, playerId, winType)).subscribe();
  }

  protected isMarked(value: number | null): boolean {
    return value !== null && this.session.isNumberExtracted(value);
  }

  protected hasAmbo(): boolean {
    const card = this.cartella();

    if (!card) {
      return false;
    }

    return card.grid.some(
      (row) =>
        row.filter((n) => n !== null && this.session.isNumberExtracted(n))
          .length >= 2,
    );
  }

  protected hasTerna(): boolean {
    const card = this.cartella();

    if (!card) {
      return false;
    }

    return card.grid.some(
      (row) =>
        row.filter((n) => n !== null && this.session.isNumberExtracted(n))
          .length >= 3,
    );
  }

  private listenNumberExtracted(): void {
    this.socket
      .onNumberExtracted()
      .pipe(
        filter(() => !!this.session.roomId()),
        switchMap(() => this.socket.getRoomState(this.session.roomId()!)),
        filter((response) => response.success && !!response.room),
        // take(1),
        tap((response) => {
          this.session.updateRoom(response.room!);
        }),
      )
      .subscribe();
  }

  private listenWinConfirmed(): void {
    this.socket
      .onWinConfirmed()
      .pipe(
        take(1),
        tap(({ room }) => this.session.updateRoom(room)),
      )
      .subscribe();
  }

  private listenWinRejected(): void {
    this.socket
      .onWinRejected()
      .pipe(
        take(1),
        tap(({ room }) => this.session.updateRoom(room)),
      )
      .subscribe();
  }

  private listenGameFinished(): void {
    this.socket
      .onGameFinished()
      .pipe(
        take(1),
        tap(({ room }) => this.session.updateRoom(room)),
      )
      .subscribe();
  }
}
