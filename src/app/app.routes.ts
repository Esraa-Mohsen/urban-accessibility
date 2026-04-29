import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Map } from './pages/map/map';
import { Dashboard } from './pages/dashboard/dashboard';
import { Contribute } from './pages/contribute/contribute';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: Home },
  { path: 'map', component: Map },
  { path: 'dashboard', component: Dashboard },
  { path: 'contribute', component: Contribute },
  { path: '**', redirectTo: 'home' }
];
