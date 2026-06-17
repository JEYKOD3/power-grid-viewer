import { computeEnergized, isZonePowered } from './energization';
import { GridElement } from '../../models/grid-element';
import { Connection } from '../../models/connection';
import { Zone } from '../../models/zone';

function el(id: number, type: string, status: string): GridElement {
  return { id, name: `E${id}`, type, tensionKv: 10, status };
}

// Réseau: G(1) -> T(2) -> DJ(3) ;  DJ(3) dessert la zone(10)
const baseElements: GridElement[] = [
  el(1, 'Générateur', 'En service'),
  el(2, 'Transformateur', 'En service'),
  el(3, 'Disjoncteur', 'En service'),
];
const baseConnections: Connection[] = [
  { id: 1, fromId: 1, toId: 2 },
  { id: 2, fromId: 2, toId: 3 },
];
const zone: Zone = { id: 10, name: 'Z', category: 'Résidentiel', x: 0, y: 0, sourceElementId: 3 };

describe('computeEnergized', () => {
  it('energizes the whole chain when everything is in service', () => {
    const energized = computeEnergized(baseElements, baseConnections);
    expect([...energized].sort()).toEqual([1, 2, 3]);
    expect(isZonePowered(zone, energized)).toBe(true);
  });

  it('energizes nothing when the generator is out of service', () => {
    const elements = baseElements.map((e) => (e.id === 1 ? { ...e, status: 'Hors service' } : e));
    const energized = computeEnergized(elements, baseConnections);
    expect(energized.size).toBe(0);
    expect(isZonePowered(zone, energized)).toBe(false);
  });

  it('blocks downstream when an intermediate breaker is out of service', () => {
    const elements = baseElements.map((e) => (e.id === 2 ? { ...e, status: 'Hors service' } : e));
    const energized = computeEnergized(elements, baseConnections);
    expect(energized.has(1)).toBe(true);
    expect(energized.has(2)).toBe(false);
    expect(energized.has(3)).toBe(false);
    expect(isZonePowered(zone, energized)).toBe(false);
  });

  it('handles multiple generators and branches independently', () => {
    const elements: GridElement[] = [
      el(1, 'Générateur', 'En service'),
      el(2, 'Disjoncteur', 'En service'),
      el(3, 'Générateur', 'Hors service'),
      el(4, 'Disjoncteur', 'En service'),
    ];
    const connections: Connection[] = [
      { id: 1, fromId: 1, toId: 2 },
      { id: 2, fromId: 3, toId: 4 },
    ];
    const energized = computeEnergized(elements, connections);
    expect(energized.has(2)).toBe(true);
    expect(energized.has(4)).toBe(false);
  });
});
