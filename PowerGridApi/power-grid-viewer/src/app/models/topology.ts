import { GridElement } from './grid-element';
import { Connection } from './connection';
import { Zone } from './zone';

export interface Topology {
  elements: GridElement[];
  connections: Connection[];
  zones: Zone[];
}
