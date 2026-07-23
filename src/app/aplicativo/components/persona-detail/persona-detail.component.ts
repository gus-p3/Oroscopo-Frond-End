import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PersonaService } from '../../../services/persona.service';

const ELEMENTO_META: Record<string, { emoji: string; color: string; gradient: string }> = {
  'Fuego': { emoji: '🔥', color: '#f97316', gradient: 'linear-gradient(135deg, #ff6b35, #f7c948)' },
  'Tierra': { emoji: '🌿', color: '#22c55e', gradient: 'linear-gradient(135deg, #16a34a, #84cc16)' },
  'Aire': { emoji: '💨', color: '#38bdf8', gradient: 'linear-gradient(135deg, #0ea5e9, #a5f3fc)' },
  'Agua': { emoji: '🌊', color: '#818cf8', gradient: 'linear-gradient(135deg, #6366f1, #38bdf8)' },
};

@Component({
  selector: 'app-persona-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './persona-detail.component.html',
  styleUrl: './persona-detail.component.css',
})
export class PersonaDetailComponent implements OnInit, OnChanges {
  @Input() idPersona?: string;
  @Output() close = new EventEmitter<void>();

  datosUsuario: any = null;
  loading: boolean = false;
  errorMessage: string = '';

  elementoGanador: any = null;
  ganadorMeta: { emoji: string; color: string; gradient: string } | null = null;
  elementosList: any[] = [];
  aspectosList: any[] = [];

  private personaService = inject(PersonaService);

  ngOnInit(): void {
    if (this.idPersona) {
      this.cargarDetalles(this.idPersona);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['idPersona'] && this.idPersona) {
      this.cargarDetalles(this.idPersona);
    }
  }

  cargarDetalles(id: string) {
    this.loading = true;
    this.errorMessage = '';
    this.elementoGanador = null;
    this.ganadorMeta = null;

    this.personaService.getPersonaPersonalidadID(id).subscribe({
      next: (res: any) => {
        const data = res?.result || res;
        this.datosUsuario = data;
        this.aspectosList = data?.aspectos || [];

        const rawElementos = data?.puntajesElementos || [];
        let maxPuntaje = 0;
        rawElementos.forEach(([_, p]: [string, number]) => {
          if (p > maxPuntaje) maxPuntaje = p;
        });

        this.elementosList = rawElementos.map(([nombreElemento, puntajeTotal]: [string, number]) => {
          const isWinner = nombreElemento === data?.elementoNombre || puntajeTotal === maxPuntaje;
          const meta = ELEMENTO_META[nombreElemento] ?? {
            emoji: '✦',
            color: '#a78bfa',
            gradient: 'linear-gradient(135deg, #a78bfa, #7c3aed)'
          };

          if (isWinner && !this.elementoGanador) {
            this.elementoGanador = { nombre: nombreElemento, puntajeTotal };
            this.ganadorMeta = meta;
          }

          return {
            nombre: nombreElemento,
            puntajeTotal,
            porcentaje: maxPuntaje > 0 ? Math.round((puntajeTotal / maxPuntaje) * 100) : 0,
            esPredominante: isWinner,
            meta
          };
        });

        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar persona:', err);
        this.errorMessage = 'No se pudo obtener la información de la persona.';
        this.loading = false;
      }
    });
  }

  getNivelLabel(valor: number): string {
    const labels: Record<number, string> = { 1: 'Bajo', 2: 'Medio', 3: 'Alto', 4: 'Muy Alto' };
    return labels[valor] ?? `${valor}`;
  }

  closePanel() {
    this.close.emit();
  }
}