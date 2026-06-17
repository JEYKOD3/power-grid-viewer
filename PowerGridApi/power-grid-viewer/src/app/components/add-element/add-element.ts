import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { Grid } from '../../services/grid';
import { GridElement } from '../../models/grid-element';
import { Connection } from '../../models/connection';

const MAP_CENTER = { x: 560, y: 380 };
const MAP_MAX = { x: 1160, y: 770 };

@Component({
  selector: 'app-add-element',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <h2>Ajouter un élément</h2>

    <form [formGroup]="form" (ngSubmit)="submit()">
      <label>
        Nom
        <select formControlName="name">
          <option value="">-- Choisir un élément --</option>
          <option *ngFor="let n of names" [value]="n">{{ n }}</option>
        </select>
      </label>
      <div class="error" *ngIf="form.get('name')?.invalid && form.get('name')?.touched">
        Le nom est requis.
      </div>

      <label>
        Type
        <select formControlName="type">
          <option value="">-- Type --</option>
          <option *ngFor="let t of types" [value]="t">{{ t }}</option>
        </select>
      </label>
      <div class="error" *ngIf="form.get('type')?.invalid && form.get('type')?.touched">
        Le type est requis.
      </div>

      <label>
        Tension (kV)
        <input formControlName="tensionKv" type="number" step="0.1" placeholder="Ex. 120" />
      </label>
      <div class="error" *ngIf="form.get('tensionKv')?.invalid && form.get('tensionKv')?.touched">
        La tension doit être un nombre supérieur à 0.
      </div>

      <label>
        Statut
        <select formControlName="status">
          <option>En service</option>
          <option>Hors service</option>
        </select>
      </label>

      <label>
        Alimenté par
        <select formControlName="connectToId">
          <option [ngValue]="null">-- Aucun (élément isolé) --</option>
          <option *ngFor="let el of elements()" [ngValue]="el.id">
            {{ el.name }} ({{ el.type }})
          </option>
        </select>
      </label>
      <small class="help">
        L'élément est placé automatiquement à côté de sa source et y est relié. Vous pourrez ensuite
        le déplacer si besoin.
      </small>

      <button type="submit" [disabled]="form.invalid || saving">
        {{ saving ? 'Ajout en cours…' : 'Ajouter' }}
      </button>

      <div class="error" *ngIf="errorMessage">{{ errorMessage }}</div>
    </form>
  `,
  styleUrl: './add-element.css',
})
export class AddElement implements OnInit {
  names = ['T-Nord', 'G-Centrale', 'CH-Secteur4', 'DJ-Ligne12', 'L-Interconnexion'];
  types = ['Transformateur', 'Générateur', 'Charge', 'Disjoncteur'];
  saving = false;
  errorMessage = '';
  elements = signal<GridElement[]>([]);
  connections = signal<Connection[]>([]);

  form;

  constructor(
    private fb: FormBuilder,
    private grid: Grid,
    private router: Router,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      tensionKv: [null as number | null, [Validators.required, Validators.min(0.1)]],
      status: ['En service', Validators.required],
      connectToId: [null as number | null],
    });
  }

  ngOnInit() {
    this.grid.getTopology().subscribe((topo) => {
      this.elements.set(topo.elements);
      this.connections.set(topo.connections);
    });
  }

  // Place le nouvel élément automatiquement: à côté de sa source (vers l'extérieur du
  // réseau), ou dans une zone libre s'il est isolé.
  private computePosition(connectToId: number | null): { x: number; y: number } {
    const source = this.elements().find((e) => e.id === connectToId);
    if (!source) {
      const isolated = this.elements().length;
      return { x: clamp(120 + (isolated % 6) * 60, MAP_MAX.x), y: clamp(720, MAP_MAX.y) };
    }

    const sx = source.x ?? MAP_CENTER.x;
    const sy = source.y ?? MAP_CENTER.y;

    // Direction depuis le centre du réseau vers la source (vers l'extérieur).
    let vx = sx - MAP_CENTER.x;
    let vy = sy - MAP_CENTER.y;
    const len = Math.hypot(vx, vy) || 1;
    vx /= len;
    vy /= len;

    // Décalage perpendiculaire pour éviter de superposer les éléments déjà branchés.
    const siblings = this.connections().filter((c) => c.fromId === connectToId).length;
    const px = -vy;
    const py = vx;
    const spread = (siblings - 1) * 70;

    return {
      x: clamp(Math.round(sx + vx * 120 + px * spread), MAP_MAX.x),
      y: clamp(Math.round(sy + vy * 120 + py * spread), MAP_MAX.y),
    };
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const { name, type, tensionKv, status, connectToId } = this.form.getRawValue();
    const pos = this.computePosition(connectToId);

    this.grid
      .create({
        id: 0,
        name: name!,
        type: type!,
        tensionKv: Number(tensionKv),
        status: status!,
        x: pos.x,
        y: pos.y,
      })
      .pipe(
        switchMap((created) =>
          connectToId != null
            ? this.grid.addConnection(Number(connectToId), created.id)
            : of(created),
        ),
      )
      .subscribe({
        next: () => this.router.navigate(['/map']),
        error: () => {
          this.saving = false;
          this.errorMessage = "Échec de l'ajout. Vérifiez que l'API est démarrée sur le port 5050.";
        },
      });
  }
}

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}
