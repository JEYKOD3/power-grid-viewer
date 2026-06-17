import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Grid } from '../../services/grid';
import { GridElement } from '../../models/grid-element';

@Component({
  selector: 'app-element-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <h2>Réseau électrique</h2>

    <div class="toolbar">
      <select [value]="selectedType()" (change)="onTypeChange($event)">
        <option value="">Tous les types</option>
        <option *ngFor="let t of types" [value]="t">{{ t }}</option>
      </select>

      <a routerLink="/add">+ Ajouter un élément</a>
    </div>

    <table>
      <thead>
        <tr>
          <th>Nom</th>
          <th>Type</th>
          <th>Tension (kV)</th>
          <th>Statut</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let el of filtered()">
          <td>{{ el.name | uppercase }}</td>
          <td>{{ el.type }}</td>
          <td>{{ el.tensionKv }} kV</td>
          <td [class.actif]="el.status === 'En service'">{{ el.status }}</td>
          <td><a [routerLink]="['/elements', el.id]">Détail</a></td>
        </tr>
      </tbody>
    </table>

    <p *ngIf="filtered().length === 0">Aucun élément à afficher.</p>
  `,
})
export class ElementList implements OnInit {
  elements = signal<GridElement[]>([]);
  selectedType = signal('');
  types = ['Transformateur', 'Générateur', 'Charge', 'Disjoncteur'];

  filtered = computed(() => {
    const type = this.selectedType();
    const all = this.elements();
    return type ? all.filter((e) => e.type === type) : all;
  });

  constructor(private grid: Grid) {}

  ngOnInit() {
    this.grid.getAll().subscribe((data) => this.elements.set(data));
  }

  onTypeChange(event: Event) {
    this.selectedType.set((event.target as HTMLSelectElement).value);
  }
}
