import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { GridMap } from './grid-map';

describe('GridMap', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [GridMap],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create and load the topology on init', () => {
    const fixture = TestBed.createComponent(GridMap);
    fixture.detectChanges();

    const req = httpMock.expectOne('http://localhost:5050/api/topology');
    expect(req.request.method).toBe('GET');
    req.flush({
      elements: [
        { id: 1, name: 'G', type: 'Générateur', tensionKv: 10, status: 'En service', x: 0, y: 0 },
      ],
      connections: [],
      zones: [],
    });

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance.elements().length).toBe(1);
  });
});
