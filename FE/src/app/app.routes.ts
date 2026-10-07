import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { BancoComponent } from './pages/banco/banco.component';
import { GiocatoreComponent } from './pages/giocatore/giocatore.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'banco', component: BancoComponent },
  { path: 'giocatore', component: GiocatoreComponent },
  { path: '**', redirectTo: '' },
];
