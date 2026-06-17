import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Grid } from '../../services/grid';
import { GridElement } from '../../models/grid-element';

@Component({
  selector: 'app-element-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <a routerLink="/elements">← Retour à la liste</a>

    <div *ngIf="element() as el; else notFound">
      <h2>{{ el.name }}</h2>
      <p><strong>Type :</strong> {{ el.type }}</p>
      <p><strong>Tension :</strong> {{ el.tensionKv }} kV</p>
      <p><strong>Statut :</strong> {{ el.status }}</p>
    </div>

    <ng-template #notFound>
      <p *ngIf="loaded()">Élément introuvable.</p>
    </ng-template>
  `,
})
export class ElementDetail implements OnInit {
  element = signal<GridElement | undefined>(undefined);
  loaded = signal(false);

  constructor(
    private route: ActivatedRoute,
    private grid: Grid,
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.grid.getById(id).subscribe({
      next: (el) => {
        this.element.set(el);
        this.loaded.set(true);
      },
      error: () => this.loaded.set(true),
    });
  }
}
