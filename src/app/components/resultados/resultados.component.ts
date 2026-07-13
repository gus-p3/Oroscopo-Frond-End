import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

// Colores y emojis por elemento
const ELEMENTO_META: Record<string, { emoji: string; color: string; gradient: string }> = {
  'Fuego': { emoji: '🔥', color: '#f97316', gradient: 'linear-gradient(135deg, #ff6b35, #f7c948)' },
  'Tierra': { emoji: '🌿', color: '#22c55e', gradient: 'linear-gradient(135deg, #16a34a, #84cc16)' },
  'Aire':   { emoji: '💨', color: '#38bdf8', gradient: 'linear-gradient(135deg, #0ea5e9, #a5f3fc)' },
  'Agua':   { emoji: '🌊', color: '#818cf8', gradient: 'linear-gradient(135deg, #6366f1, #38bdf8)' },
};

@Component({
  selector: 'app-resultados',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './resultados.component.html',
  styleUrls: ['./resultados.component.css']
})
export class ResultadosComponent implements OnInit {
  resultado: any;
  datosUsuario: any;

  elementoGanador: any = null;
  ganadorMeta: { emoji: string; color: string; gradient: string } | null = null;
  elementosList: any[] = [];
  aspectosList: any[] = [];

  constructor(private router: Router) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.resultado = navigation.extras.state['resultado'];
      this.datosUsuario = navigation.extras.state['datos'];
    }
  }

  ngOnInit() {
    if (!this.resultado) {
      this.router.navigate(['/']);
      return;
    }

    this.aspectosList = this.resultado.vectorAspectos ?? [];
    
    // Enriquecer puntajes con porcentaje y metadata visual
    const maxPuntaje = 36; // máximo teórico con la nueva regla (12 preguntas * 3 puntos)
    this.elementosList = (this.resultado.puntajesElemento ?? []).map((e: any) => ({
      ...e,
      nombre: e.elementoNombre ?? e.elementoId,
      porcentaje: Math.round((e.puntajeTotal / maxPuntaje) * 100),
      meta: ELEMENTO_META[e.elementoNombre] ?? { emoji: '✦', color: '#a78bfa', gradient: 'linear-gradient(135deg, #a78bfa, #7c3aed)' }
    }));

    // Obtener el ganador
    this.elementoGanador = this.elementosList.find((e: any) => e.esPredominante);
    if (this.elementoGanador) {
      this.ganadorMeta = this.elementoGanador.meta;
    }
  }

  getNivelLabel(valor: number): string {
    const labels: Record<number, string> = { 1: 'Bajo', 2: 'Medio', 3: 'Alto', 4: 'Muy Alto' };
    return labels[valor] ?? `${valor}`;
  }

  reiniciar() {
    this.router.navigate(['/']);
  }
}
