import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Grid } from '../../services/grid';
import { GridElement } from '../../models/grid-element';
import { Connection } from '../../models/connection';
import { Zone } from '../../models/zone';
import { IN_SERVICE, computeEnergized, isZonePowered } from './energization';

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

  energized = computed(() => computeEnergized(this.elements(), this.connections()));

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

  elementFill(el: GridElement): string {
    if (!this.isInService(el)) return '#9ca3af';
    return this.isEnergized(el.id) ? '#16a34a' : '#f59e0b';
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
