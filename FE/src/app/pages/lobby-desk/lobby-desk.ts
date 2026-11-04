import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { from } from 'rxjs';
import { Room, Player } from '../../models/tombola.models';

@Component({
  selector: 'app-lobby-desk',
  templateUrl: './lobby-desk.html',
  styleUrl: './lobby-desk.scss',
  standalone: true,
})
export class LobbyDesk implements OnInit {
  private readonly socket = inject(SocketService);
  private readonly router = inject(Router);

  protected readonly connected = toSignal(this.socket.onConnectionChanged(), {
    initialValue: this.socket.isConnected(),
  });

  protected readonly room = signal<Room | null>(null);
  protected readonly players = signal<Player[]>([]);
  protected readonly loading = signal(false);
  protected readonly search = signal('');

  protected readonly filteredPlayers = computed(() => {
    const term = this.search().toLowerCase();

    if (!term) {
      return this.players();
    }

    return this.players().filter((player) =>
      player.name.toLowerCase().includes(term),
    );
  });

  protected readonly playerCount = computed(() => this.players().length);

  ngOnInit(): void {
    this.socket.connect();

    this.createRoom();

    this.socket.onPlayerJoined().subscribe((event) => {
      this.room.set(event.room);

      this.players.set(event.room.players);
    });

    this.socket.onPlayerLeft().subscribe((event) => {
      this.room.set(event.room);

      this.players.set(event.room.players);
    });
  }

  protected goback(): void {
    this.router.navigate(['/']);
  }

  protected createRoom(): void {
    from(this.socket.createRoom()).subscribe((response) => {
      if (!response.success || !response.room) {
        return;
      }

      this.room.set(response.room);
      sessionStorage.setItem(
        'roomId',
        response.room.id,
      );

      this.players.set(response.room.players);
    });
  }

  protected startGame(): void {

    const roomId = this.room()?.id;

    if (!roomId) {
      return;
    }

    from(
      this.socket.startGame(roomId),
    ).subscribe((response) => {
      console.log(response)
      if (!response.success) {
        return;
      }
    this.router.navigate(['/banco']);

    });
  }

  protected closeRoom(): void {
    this.socket.disconnect();
    this.router.navigate(['/']);
  }

  protected leave(): void {
    this.router.navigate(['/']);
  }

  protected initials(name: string): string {
    return name
      .split(' ')
      .map((x) => x[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}
