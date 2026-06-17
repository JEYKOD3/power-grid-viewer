import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { Grid } from './grid';
import { GridElement } from '../models/grid-element';

describe('Grid', () => {
  let service: Grid;
  let httpMock: HttpTestingController;

  const apiUrl = 'http://localhost:5000/api/elements';
  const mockElement: GridElement = {
    id: 1,
    name: 'T-Nord',
    type: 'Transformateur',
    tensionKv: 120,
    status: 'En service',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Grid);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAll should fetch all elements', () => {
    const mockElements = [mockElement];

    service.getAll().subscribe((elements) => {
      expect(elements).toEqual(mockElements);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockElements);
  });

  it('getById should fetch one element', () => {
    service.getById(1).subscribe((element) => {
      expect(element).toEqual(mockElement);
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockElement);
  });

  it('create should post a new element', () => {
    const newElement: GridElement = {
      id: 0,
      name: 'Test',
      type: 'Charge',
      tensionKv: 10,
      status: 'En service',
    };
    const createdElement = { ...newElement, id: 5 };

    service.create(newElement).subscribe((element) => {
      expect(element).toEqual(createdElement);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newElement);
    req.flush(createdElement);
  });
});
