import { TestBed } from '@angular/core/testing';

import { Grid } from './grid';

describe('Grid', () => {
  let service: Grid;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Grid);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
