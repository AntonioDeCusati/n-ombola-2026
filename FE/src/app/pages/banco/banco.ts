import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { Router } from '@angular/router';
import { filter, finalize, from, tap } from 'rxjs';

import { SocketService } from '../../services/socket.service';

import { NumberExtractedEvent, Room } from '../../models/tombola.models';

@Component({
  selector: 'app-banco',
  standalone: true,
  templateUrl: './banco.html',
  styleUrl: './banco.scss',
})
export class Banco implements OnInit {
  private readonly socket = inject(SocketService);
  private readonly router = inject(Router);

  protected readonly room = signal<Room | null>(null);
  protected readonly extractedNumbers = signal<number[]>([]);
  protected readonly lastNumber = signal<number | null>(null);
  protected readonly loading = signal(false);
  protected readonly autoExtraction = signal(false);
  protected readonly countdown = signal(10);

  private extractionInterval?: ReturnType<typeof setInterval>;
  private countdownInterval?: ReturnType<typeof setInterval>;
  protected readonly boardNumbers = Array.from({ length: 90 }, (_, i) => i + 1);
  protected readonly roomId = sessionStorage.getItem('roomId');

  protected readonly extractedCount = computed(
    () => this.extractedNumbers().length,
  );

  protected readonly latestExtractions = computed(() =>
    [...this.extractedNumbers()].reverse().slice(0, 10),
  );

  ngOnInit(): void {
    this.socket.connect();

    const roomId = sessionStorage.getItem('roomId');

    if (roomId) {
      from(this.socket.getRoomState(roomId)).subscribe((response) => {
        if (response.success && response.room) {
          this.room.set(response.room);

          this.extractedNumbers.set(response.room.extractedNumbers);

          const extracted = response.room.extractedNumbers;

          if (extracted.length > 0) {
            this.lastNumber.set(extracted.at(-1) ?? null);
          }
        }
      });
    }

    this.socket.onNumberExtracted().subscribe((event) => {
      this.lastNumber.set(event.number);

      this.extractedNumbers.set(event.extractedNumbers);
    });
  }

  protected isLastExtracted(number: number): boolean {
    return this.lastNumber() === number;
  }

  protected isExtracted(number: number): boolean {
    return this.extractedNumbers().includes(number);
  }

  protected extractNumber(): void {
    const roomId = this.room()?.id;
    if (!roomId) {
      return;
    }

    this.loading.set(true);

    from(this.socket.extractNumber(roomId))
      .pipe(
        filter((response) => !!response && response.success),
        tap((response) => {
          if (response.number) {
            this.lastNumber.set(response.number);
          }
          if (response.extractedNumbers) {
            this.extractedNumbers.set(response.extractedNumbers);
          }
        }),
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe();
  }

  protected goBack(): void {
    this.stopAutoExtraction();
    this.router.navigate(['/banco-lobby']);
  }

  protected toggleAutoExtraction(): void {
    if (this.autoExtraction()) {
      this.stopAutoExtraction();
    } else {
      this.startAutoExtraction();
    }
  }
  
  private startAutoExtraction(): void {
    this.autoExtraction.set(true);
    this.countdown.set(10);

    this.countdownInterval = setInterval(() => {
      if (this.countdown() > 1) {
        this.countdown.update((value) => value - 1);
      } else {
        this.countdown.set(10);
      }
    }, 1000);

    this.extractionInterval = setInterval(() => {
      this.extractNumber();
    }, 10000);
  }

  private stopAutoExtraction(): void {
    this.autoExtraction.set(false);

    if (this.extractionInterval) {
      clearInterval(this.extractionInterval);
    }

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }
}
