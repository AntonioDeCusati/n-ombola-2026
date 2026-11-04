import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { LobbyDesk } from './pages/lobby-desk/lobby-desk';
import { Giocatore } from './pages/giocatore/giocatore';
import { JoinPlayer } from './pages/join-player/join-player';
import { Banco } from './pages/banco/banco';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'crea-banco', component: LobbyDesk },
  { path: 'banco', component: Banco },
  { path: 'giocatore', component: Giocatore },
  { path: 'unisciti-giocatore', component: JoinPlayer },
  { path: '**', redirectTo: '' },
];
