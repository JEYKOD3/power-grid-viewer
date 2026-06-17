import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Grid } from '../../services/grid';

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

      <button type="submit" [disabled]="form.invalid || saving">
        {{ saving ? 'Ajout en cours…' : 'Ajouter' }}
      </button>

      <div class="error" *ngIf="errorMessage">{{ errorMessage }}</div>
    </form>
  `,
})
export class AddElement {
  names = ['T-Nord', 'G-Centrale', 'CH-Secteur4', 'DJ-Ligne12', 'L-Interconnexion'];
  types = ['Transformateur', 'Générateur', 'Charge', 'Disjoncteur'];
  saving = false;
  errorMessage = '';

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
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const { name, type, tensionKv, status } = this.form.getRawValue();
    this.grid
      .create({ id: 0, name: name!, type: type!, tensionKv: Number(tensionKv), status: status! })
      .subscribe({
        next: () => this.router.navigate(['/elements']),
        error: () => {
          this.saving = false;
          this.errorMessage = "Échec de l'ajout. Vérifiez que l'API est démarrée sur le port 5000.";
        },
      });
  }
}
