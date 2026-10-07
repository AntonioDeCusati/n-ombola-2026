import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Room, WinType } from '../models/tombola.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  healthCheck(): Observable<{ status: string; timestamp: number }> {
    return this.http.get<{ status: string; timestamp: number }>(`${this.baseUrl}/health`);
  }

  getCartelleCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/cartelle/count`);
  }

  getWinTypes(): Observable<{ winTypes: WinType[] }> {
    return this.http.get<{ winTypes: WinType[] }>(`${this.baseUrl}/win-types`);
  }

  getRoom(roomId: string): Observable<{ room: Room }> {
    return this.http.get<{ room: Room }>(`${this.baseUrl}/rooms/${roomId}`);
  }
}
