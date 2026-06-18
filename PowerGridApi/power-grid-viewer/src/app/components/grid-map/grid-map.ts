import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Grid } from '../../services/grid';
import { GridElement } from '../../models/grid-element';
import { Connection } from '../../models/connection';
import { Zone } from '../../models/zone';
import {
  ContingencyResult,
  IN_SERVICE,
  computeContingencies,
  computeEnergized,
  isZonePowered,
} from './energization';

interface ConnectionView {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  live: boolean;
}

interface ZoneView extends Zone {
  powered: boolean;
}

interface RankedContingency extends ContingencyResult {
  name: string;
  type: string;
}

type MapMode = 'reseau' | 'criticite';

@Component({
  selector: 'app-grid-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grid-map.html',
  styleUrl: './grid-map.css',
})
export class GridMap implements OnInit {
  elements = signal<GridElement[]>([]);
  connections = signal<Connection[]>([]);
  zones = signal<Zone[]>([]);
  saving = signal(false);
  mode = signal<MapMode>('reseau');

  energized = computed(() => computeEnergized(this.elements(), this.connections()));

  contingencies = computed(() =>
    computeContingencies(this.elements(), this.connections(), this.zones()),
  );

  private contingencyById = computed(
    () => new Map(this.contingencies().map((c) => [c.elementId, c])),
  );

  private maxCustomersLost = computed(() =>
    this.contingencies().reduce((max, c) => Math.max(max, c.customersLost), 0),
  );

  // Classement des équipements les plus critiques (impact décroissant).
  ranking = computed<RankedContingency[]>(() => {
    const byId = new Map(this.elements().map((e) => [e.id, e]));
    return this.contingencies()
      .filter((c) => c.customersLost > 0 || c.zonesLost > 0)
      .map((c) => ({
        ...c,
        name: byId.get(c.elementId)?.name ?? `#${c.elementId}`,
        type: byId.get(c.elementId)?.type ?? '',
      }))
      .sort((a, b) => b.customersLost - a.customersLost || b.loadLostMw - a.loadLostMw);
  });

  connectionViews = computed<ConnectionView[]>(() => {
    const byId = new Map(this.elements().map((e) => [e.id, e]));
    const energized = this.energized();
    return this.connections()
      .map((c) => {
        const from = byId.get(c.fromId);
        const to = byId.get(c.toId);
        if (!from || !to) return null;
        return {
          id: c.id,
          x1: from.x ?? 0,
          y1: from.y ?? 0,
          x2: to.x ?? 0,
          y2: to.y ?? 0,
          live: energized.has(c.fromId) && energized.has(c.toId),
        };
      })
      .filter((v): v is ConnectionView => v !== null);
  });

  zoneViews = computed<ZoneView[]>(() => {
    const energized = this.energized();
    return this.zones().map((z) => ({ ...z, powered: isZonePowered(z, energized) }));
  });

  zoneSourceLinks = computed(() => {
    const byId = new Map(this.elements().map((e) => [e.id, e]));
    return this.zoneViews()
      .map((z) => {
        const source = byId.get(z.sourceElementId);
        if (!source) return null;
        return {
          id: z.id,
          x1: source.x ?? 0,
          y1: source.y ?? 0,
          x2: z.x,
          y2: z.y,
          live: z.powered,
        };
      })
      .filter((v): v is ConnectionView => v !== null);
  });

  constructor(private grid: Grid) {}

  ngOnInit() {
    this.grid.getTopology().subscribe((topo) => {
      this.elements.set(topo.elements);
      this.connections.set(topo.connections);
      this.zones.set(topo.zones);
    });
  }

  isEnergized(id: number): boolean {
    return this.energized().has(id);
  }

  isInService(el: GridElement): boolean {
    return el.status === IN_SERVICE;
  }

  setMode(mode: MapMode) {
    this.mode.set(mode);
  }

  // Couleur d'un élément selon le mode courant.
  fillFor(el: GridElement): string {
    return this.mode() === 'criticite' ? this.criticalityFill(el) : this.elementFill(el);
  }

  elementFill(el: GridElement): string {
    if (!this.isInService(el)) return '#9ca3af';
    return this.isEnergized(el.id) ? '#16a34a' : '#f59e0b';
  }

  // Échelle de chaleur (jaune -> rouge) proportionnelle aux clients perdus.
  criticalityFill(el: GridElement): string {
    if (!this.isInService(el)) return '#cbd5e1';
    const impact = this.contingencyById().get(el.id)?.customersLost ?? 0;
    const max = this.maxCustomersLost();
    if (impact === 0 || max === 0) return '#94a3b8';
    const ratio = impact / max;
    const hue = 48 - 48 * ratio; // 48 (ambre) -> 0 (rouge)
    const light = 55 - 12 * ratio;
    return `hsl(${hue}, 90%, ${light}%)`;
  }

  criticalityOf(id: number): ContingencyResult | undefined {
    return this.contingencyById().get(id);
  }

  toggle(el: GridElement) {
    if (this.saving()) return;
    const next = this.isInService(el) ? 'Hors service' : IN_SERVICE;
    this.saving.set(true);
    this.grid.updateStatus(el.id, next).subscribe({
      next: (updated) => {
        this.elements.update((list) => list.map((e) => (e.id === updated.id ? updated : e)));
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }
}
