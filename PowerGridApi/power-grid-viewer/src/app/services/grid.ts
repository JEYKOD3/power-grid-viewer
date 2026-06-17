import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GridElement } from '../models/grid-element';
import { Topology } from '../models/topology';

@Injectable({
  providedIn: 'root',
})
export class Grid {
  private apiBase = 'http://localhost:5050/api';
  private apiUrl = `${this.apiBase}/elements`;

  constructor(private http: HttpClient) {}

  // Récupérer la liste de tous les éléments du réseau électrique.
  getAll(): Observable<GridElement[]> {
    return this.http.get<GridElement[]>(this.apiUrl);
  }

  // Récupérer un élément par son ID.
  getById(id: number): Observable<GridElement> {
    return this.http.get<GridElement>(`${this.apiUrl}/${id}`);
  }

  // Créer un nouvel élément.
  create(element: GridElement): Observable<GridElement> {
    return this.http.post<GridElement>(this.apiUrl, element);
  }

  // Récupérer toute la topologie du réseau (éléments, liaisons, zones).
  getTopology(): Observable<Topology> {
    return this.http.get<Topology>(`${this.apiBase}/topology`);
  }

  // Mettre à jour le statut d'un élément (En service / Hors service).
  updateStatus(id: number, status: string): Observable<GridElement> {
    return this.http.put<GridElement>(`${this.apiUrl}/${id}/status`, { status });
  }
}
