import { Routes } from '@angular/router';
import { ElementList } from './components/element-list/element-list';
import { ElementDetail } from './components/element-detail/element-detail';
import { AddElement } from './components/add-element/add-element';

// Routes de l'application.
export const routes: Routes = [
  // Redirection vers la liste des éléments.
  { path: '', redirectTo: 'elements', pathMatch: 'full' },
  { path: 'elements', component: ElementList },
  { path: 'elements/:id', component: ElementDetail },
  { path: 'add', component: AddElement },
];
