import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { BancoComponent } from './pages/banco/banco.component';
import { Giocatore } from './pages/giocatore/giocatore';
import { JoinPlayer } from './pages/join-player/join-player';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'banco', component: BancoComponent },
  { path: 'giocatore', component: Giocatore },
  { path: 'unisciti-giocatore', component: JoinPlayer },
  { path: '**', redirectTo: '' },
];
