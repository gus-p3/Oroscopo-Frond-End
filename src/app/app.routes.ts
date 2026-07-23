import { Routes } from '@angular/router';
import { CuestionarioComponent } from './components/cuestionario/cuestionario.component';
import { ResultadosComponent } from './components/resultados/resultados.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { LoginComponent } from './components/login/login.component';
import { authGuard } from './guards/auth.guard';
import { DashboardComponent } from './aplicativo/dashboard/dashboard.component';
import { PersonaDetailComponent } from './aplicativo/components/persona-detail/persona-detail.component';

export const routes: Routes = [
  { path: '', component: CuestionarioComponent },
  { path: 'resultados', component: ResultadosComponent },
  { path: 'login', component: LoginComponent },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [authGuard] },
  { path: 'clustering', component: DashboardComponent },
  { path: 'persona', component: PersonaDetailComponent },
  { path: '**', redirectTo: '' } // Siempre debe ir al final
];
