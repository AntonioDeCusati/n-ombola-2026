import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.html',
  styleUrl: './home.scss',
  imports: [],
})
export class Home {
  
  private readonly router: Router = inject(Router);

  enterAsPlayer(): void {
    this.router.navigate(['/unisciti-giocatore']);
  }

  enterAsHost(): void {
    this.router.navigate(['/banco']);
  }

}
