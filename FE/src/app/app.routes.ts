import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { LobbyDesk } from './pages/banco/lobby-desk';
import { Giocatore } from './pages/giocatore/giocatore';
import { JoinPlayer } from './pages/join-player/join-player';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'banco', component: LobbyDesk },
  { path: 'giocatore', component: Giocatore },
  { path: 'unisciti-giocatore', component: JoinPlayer },
  { path: '**', redirectTo: '' },
];
