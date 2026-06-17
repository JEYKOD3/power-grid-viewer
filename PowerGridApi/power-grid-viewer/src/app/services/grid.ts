import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GridElement } from '../models/grid-element';

@Injectable({
  providedIn: 'root',
})
export class Grid {
  private apiUrl = 'http://localhost:5000/api/elements';

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
}
