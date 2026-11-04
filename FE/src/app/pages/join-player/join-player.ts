import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { GameSessionService } from '../../services/game-session.service';
import { SocketService } from '../../services/socket.service';
import { filter, finalize, from, tap } from 'rxjs';

@Component({
  selector: 'app-join-player',
  standalone: true,
  templateUrl: './join-player.html',
  styleUrl: './join-player.scss',
})
export class JoinPlayer implements OnInit{

  private readonly socket = inject(SocketService);
  private readonly session = inject(GameSessionService);
  private readonly router = inject(Router);

  protected readonly snowflakes = signal(Array.from({ length: 12 }));
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly connected = toSignal(
    this.socket.onConnectionChanged(),
    {
      initialValue: this.socket.isConnected(),
    },
  );

  protected readonly roomCode = signal('');
  protected readonly playerName = signal('');
  protected readonly joining = signal(false);
  protected readonly roomFound = signal(false);
  protected readonly isConnected = signal(true);

  protected readonly roomDigits = computed(() => {
    const code = this.roomCode();
    return [
      code[0] ?? '',
      code[1] ?? '',
      code[2] ?? '',
      code[3] ?? '',
    ];
  });

  ngOnInit(): void {
    this.socket.connect()
  }

  protected clearCode(): void {
    this.roomCode.set('');
    this.roomFound.set(false);
  }

  protected removeLastDigit(): void {
    this.roomCode.update(code => code.slice(0, -1));
  }

  protected join(): void {

    if ( this.roomCode().length !== 4 || !this.playerName().trim()) {
      return;
    }

    this.errorMessage.set(null);
    this.joining.set(true);

    from(
      this.socket.joinRoom(
        this.roomCode(),
        this.playerName(),
      ),
    ).pipe(
      tap((response) => {
        if (!response.success) {
          this.errorMessage.set(
            response.message ??
            'Errore durante l\'accesso alla stanza.'
          );
          return;
        }

        this.session.setPlayerSession(
          response.room!,
          response.cartella!,
          response.playerId!,
          this.playerName(),
        );

       this.router.navigate(['/giocatore']);
      }),
      finalize(() => {
        this.joining.set(false);
      }),
    ).subscribe();
  }

  protected goback(): void {
    this.router.navigate(['/']);
  }

  protected resetName(): void {
    this.playerName.set('');
  }

  protected appendDigit(value: string): void {
    if (this.roomCode().length >= 4) {
      return;
    }

    this.roomCode.update(code => code + value);

    if (this.roomCode().length === 4) {
      this.checkRoom();
    }
  }

  private checkRoom(): void {
    from(
      this.socket.getRoomState(this.roomCode()),
    ).pipe(
      tap((response) => {
        this.roomFound.set(response.success);
      }),
    ).subscribe();
  }
}