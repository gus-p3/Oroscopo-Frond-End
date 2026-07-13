import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, SignoZodiacal } from '../../services/api.service';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

const ELEMENTO_EMOJI: Record<string, string> = {
  'Fuego': '🔥', 'Tierra': '🌿', 'Aire': '💨', 'Agua': '🌊'
};

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    MatIconModule, MatButtonModule, MatSelectModule, MatFormFieldModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  estadisticas: any = null;
  envios: any[] = [];
  totalEnvios = 0;
  signos: SignoZodiacal[] = [];

  // Panel de detalle
  detalleAbierto = false;
  detalleEnvio: any = null;
  cargandoDetalle = false;

  filtros = { genero: '', signoZodiacalId: '' };

  getEmoji(nombre: string): string {
    return ELEMENTO_EMOJI[nombre] ?? '✦';
  }

  ngOnInit() {
    this.api.getCatalogos().subscribe(res => {
      this.signos = res.signos;
    });
    this.cargarDatos();
  }

  cargarDatos() {
    this.api.getEstadisticas().subscribe(res => {
      this.estadisticas = res;
    });
    this.cargarEnvios();
  }

  cargarEnvios() {
    const filtrosApi: any = {};
    if (this.filtros.genero) filtrosApi.genero = this.filtros.genero;
    if (this.filtros.signoZodiacalId) filtrosApi.signoZodiacalId = this.filtros.signoZodiacalId;

    this.api.getEnvios(50, 0, filtrosApi).subscribe(res => {
      this.envios = res.envios;
      this.totalEnvios = res.total;
    });
  }

  verDetalle(envio: any) {
    this.detalleAbierto = true;
    this.detalleEnvio = null;
    this.cargandoDetalle = true;
    this.api.getEnvioById(envio._id).subscribe({
      next: (res) => {
        this.detalleEnvio = res;
        this.cargandoDetalle = false;
      },
      error: () => { this.cargandoDetalle = false; }
    });
  }

  cerrarDetalle() {
    this.detalleAbierto = false;
    this.detalleEnvio = null;
  }

  aplicarFiltros() {
    this.cargarEnvios();
  }

  exportarCsv() {
    let url = `${environment.apiUrl}/envios/exportar?formato=csv`;
    if (this.filtros.genero) url += `&genero=${this.filtros.genero}`;
    if (this.filtros.signoZodiacalId) url += `&signoZodiacalId=${this.filtros.signoZodiacalId}`;
    window.open(url, '_blank');
  }

  getSignoNombre(persona: any): string {
    return persona?.signoZodiacalId?.nombre ?? 'N/A';
  }

  getPredominante(env: any): string {
    return (env?.predominante as any)?.nombre ?? 'N/A';
  }

  logout() {
    this.auth.logout();
  }
}
