import { computeContingencies, computeEnergized, isZonePowered } from './energization';
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
const zone: Zone = {
  id: 10,
  name: 'Z',
  category: 'Résidentiel',
  x: 0,
  y: 0,
  sourceElementId: 3,
  loadMw: 5,
  customers: 100,
};

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

  it('ranks N-1 contingencies by lost zones/customers/load', () => {
    // Chaque élément de la chaîne fait tomber la zone unique en aval.
    const results = computeContingencies(baseElements, baseConnections, [zone]);

    expect(results.length).toBe(3);
    for (const r of results) {
      expect(r.zonesLost).toBe(1);
      expect(r.customersLost).toBe(100);
      expect(r.loadLostMw).toBe(5);
    }
  });

  it('reports no impact for an element with nothing downstream', () => {
    // Le disjoncteur DJ(3) est en bout de chaîne: aucune zone n'en dépend.
    const noZones: Zone[] = [];
    const results = computeContingencies(baseElements, baseConnections, noZones);
    expect(results.every((r) => r.customersLost === 0 && r.zonesLost === 0)).toBe(true);
  });

  it('skips out-of-service elements in the contingency list', () => {
    const elements = baseElements.map((e) => (e.id === 3 ? { ...e, status: 'Hors service' } : e));
    const results = computeContingencies(elements, baseConnections, [zone]);
    expect(results.find((r) => r.elementId === 3)).toBeUndefined();
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
