import { GridElement } from '../../models/grid-element';
import { Connection } from '../../models/connection';
import { Zone } from '../../models/zone';

export const IN_SERVICE = 'En service';
export const GENERATOR_TYPE = 'Générateur';

/**
 * Calcule l'ensemble des identifiants d'éléments alimentés.
 *
 * La puissance part des générateurs en service et se propage le long des
 * liaisons orientées (FromId -> ToId). On n'entre dans un élément que s'il est
 * lui-même "En service" : un transformateur ou un disjoncteur hors service
 * coupe donc tout ce qui se trouve en aval.
 */
export function computeEnergized(elements: GridElement[], connections: Connection[]): Set<number> {
  const byId = new Map<number, GridElement>(elements.map((e) => [e.id, e]));

  const adjacency = new Map<number, number[]>();
  for (const c of connections) {
    const list = adjacency.get(c.fromId) ?? [];
    list.push(c.toId);
    adjacency.set(c.fromId, list);
  }

  const energized = new Set<number>();
  const queue: number[] = [];

  for (const el of elements) {
    if (el.type === GENERATOR_TYPE && el.status === IN_SERVICE) {
      energized.add(el.id);
      queue.push(el.id);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighborId of adjacency.get(current) ?? []) {
      if (energized.has(neighborId)) continue;
      const neighbor = byId.get(neighborId);
      if (neighbor && neighbor.status === IN_SERVICE) {
        energized.add(neighborId);
        queue.push(neighborId);
      }
    }
  }

  return energized;
}

/** Une zone est alimentée si l'élément qui la dessert est alimenté. */
export function isZonePowered(zone: Zone, energized: Set<number>): boolean {
  return energized.has(zone.sourceElementId);
}
