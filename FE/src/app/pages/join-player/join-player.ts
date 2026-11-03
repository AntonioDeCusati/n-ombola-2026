import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { GameSessionService } from '../../services/game-session.service';
import { SocketService } from '../../services/socket.service';

@Component({
  selector: 'app-join-player',
  standalone: true,
  templateUrl: './join-player.html',
  styleUrl: './join-player.scss',
})
export class JoinPlayer{
  private readonly socket = inject(SocketService);
  private readonly session = inject(GameSessionService);
  private readonly router = inject(Router);

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

  protected appendDigit(value: string): void {
    if (this.roomCode().length >= 4) {
      return;
    }

    this.roomCode.update(code => code + value);
  }

  protected clearCode(): void {
    this.roomCode.set('');
    this.roomFound.set(false);
  }

  protected removeLastDigit(): void {
    this.roomCode.update(code => code.slice(0, -1));
  }

  protected async join(): Promise<void> {
    if (this.roomCode().length !== 4) {
      return;
    }

    this.joining.set(true);

    try {
      const response = await this.socket.joinRoom(
        this.roomCode(),
        this.playerName() || 'Guest',
      );

      if (!response.success) {
        alert(response.message);
        return;
      }

      this.session.setPlayerSession(
        response.room!,
        response.cartella!,
        response.playerId!,
        this.playerName() || 'Guest',
      );

      await this.router.navigate(['/giocatore']);

    } finally {
      this.joining.set(false);
    }
  }

  protected goback(): void {
    this.router.navigate(['/']);

  }
}