import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavBarComponent } from '../nav-bar/nav-bar.component';
import { SelectAlgoritmComponent, AlgoritmItem } from '../components/select-algoritm/select-algoritm.component';
import { KMeansComponent } from '../components/k-means/k-means.component';
import { HierarchicalComponent } from '../components/hierarchical/hierarchical.component';
import { AlgorithmService, KMeansResultResponse, HierarchicalResultResponse, ElbowResultResponse } from '../../services/algorithm.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    NavBarComponent, 
    SelectAlgoritmComponent, 
    KMeansComponent,
    HierarchicalComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private algorithmService = inject(AlgorithmService);
  private apiService = inject(ApiService);

  // Fase activa en el dashboard (fase1, fase2, fase3, fase4)
  currentPhase: string = 'fase3';

  selectedAlgorithmId: string = 'kmeans';
  selectedAlgorithmName: string = 'K-Means Clustering';
  
  // Parámetros de formulario para K-Means
  kValue: number = 3;
  incluirPCA: boolean = true;

  // Parámetros para Clusterización Jerárquica
  metodoEnlace: 'ward' | 'average' | 'complete' = 'ward';
  nClusters: number = 3;

  // Estados de ejecución
  isLoading: boolean = false;
  errorMessage: string = '';

  // Respuestas del Backend
  kmeansData: KMeansResultResponse | null = null;
  hierarchicalData: HierarchicalResultResponse | null = null;

  // Estado Método del Codo
  isCalculatingElbow: boolean = false;
  elbowData: ElbowResultResponse | null = null;

  // Listas de datos para selección
  personas: any[] = [];
  personasFiltradas: any[] = [];
  preguntas: any[] = [];

  // Catálogos para filtrado
  signos: any[] = [];

  // Filtros de personas en Fase 1
  searchPersona: string = '';
  filterPersonaGender: string = 'all';
  filterPersonaSign: string = 'all';

  // IDs Seleccionados de Pasos 1 y 2
  personaIdsSeleccionadas: string[] = [];
  preguntaIdsSeleccionadas: string[] = [];

  // Historial de Bitácoras de Actividad (Estado local del frontend)
  bitacoraLogs: any[] = [];

  ngOnInit() {
    // Cargar catálogos para filtros
    this.apiService.getCatalogos().subscribe({
      next: (res) => {
        this.signos = res.signos || [];
      }
    });

    // Cargar todas las personas registradas con puntajes
    this.apiService.getPersonas(1000, 0).subscribe({
      next: (res) => {
        this.personas = res.personas || [];
        this.personasFiltradas = [...this.personas];
        // Seleccionar todas por defecto
        this.personaIdsSeleccionadas = this.personas.map(p => p._id);
      },
      error: (err) => {
        console.error('Error al cargar personas:', err);
      }
    });

    // Cargar las preguntas del cuestionario
    this.apiService.getCuestionario().subscribe({
      next: (res) => {
        this.preguntas = res || [];
        // Seleccionar todas por defecto
        this.preguntaIdsSeleccionadas = this.preguntas.map(q => q._id);
      },
      error: (err) => {
        console.error('Error al cargar preguntas:', err);
      }
    });
  }

  // Filtrado de personas en Fase 1
  filtrarPersonas() {
    this.personasFiltradas = this.personas.filter(p => {
      const matchesSearch = !this.searchPersona || p.nombre.toLowerCase().includes(this.searchPersona.toLowerCase());
      const matchesGender = this.filterPersonaGender === 'all' || p.genero === this.filterPersonaGender;
      const matchesSign = this.filterPersonaSign === 'all' || p.signoZodiacal === this.filterPersonaSign;
      return matchesSearch && matchesGender && matchesSign;
    });
  }

  isPersonaSelected(id: string): boolean {
    return this.personaIdsSeleccionadas.includes(id);
  }

  togglePersonaSelection(id: string) {
    const idx = this.personaIdsSeleccionadas.indexOf(id);
    if (idx > -1) {
      this.personaIdsSeleccionadas.splice(idx, 1);
    } else {
      this.personaIdsSeleccionadas.push(id);
    }
  }

  isAllVisiblePersonasSelected(): boolean {
    if (this.personasFiltradas.length === 0) return false;
    return this.personasFiltradas.every(p => this.isPersonaSelected(p._id));
  }

  toggleAllVisiblePersonas() {
    const visibleIds = this.personasFiltradas.map(p => p._id);
    const allSelected = this.isAllVisiblePersonasSelected();
    
    if (allSelected) {
      // Quitar todas las visibles
      this.personaIdsSeleccionadas = this.personaIdsSeleccionadas.filter(id => !visibleIds.includes(id));
    } else {
      // Agregar todas las visibles
      visibleIds.forEach(id => {
        if (!this.personaIdsSeleccionadas.includes(id)) {
          this.personaIdsSeleccionadas.push(id);
        }
      });
    }
  }

  isQuestionSelected(id: string): boolean {
    return this.preguntaIdsSeleccionadas.includes(id);
  }

  toggleQuestionSelection(id: string) {
    const idx = this.preguntaIdsSeleccionadas.indexOf(id);
    if (idx > -1) {
      this.preguntaIdsSeleccionadas.splice(idx, 1);
    } else {
      this.preguntaIdsSeleccionadas.push(id);
    }
  }

  toggleAllQuestions() {
    if (this.preguntaIdsSeleccionadas.length === this.preguntas.length) {
      this.preguntaIdsSeleccionadas = [];
    } else {
      this.preguntaIdsSeleccionadas = this.preguntas.map(q => q._id);
    }
  }

  onPhaseChange(phaseId: string) {
    this.currentPhase = phaseId;
  }

  onAlgorithmSelected(algorithm: AlgoritmItem) {
    this.selectedAlgorithmId = algorithm.id;
    this.selectedAlgorithmName = algorithm.nombre;
    this.errorMessage = '';
  }

  calculateElbow() {
    this.isCalculatingElbow = true;
    this.errorMessage = '';
    
    // Pasar los IDs de personas y preguntas seleccionadas para que el cálculo coincida
    this.algorithmService.executeElbow(10, this.personaIdsSeleccionadas, this.preguntaIdsSeleccionadas).subscribe({
      next: (res) => {
        this.elbowData = res;
        this.isCalculatingElbow = false;
      },
      error: (err) => {
        this.isCalculatingElbow = false;
        this.errorMessage = err?.error?.error || err?.error?.message || 'Error al calcular la curva del codo.';
      }
    });
  }

  setKFromElbow(k: number) {
    this.kValue = k;
  }

  get elbowSvgPoints(): { k: number; inercia: number; cx: number; cy: number }[] {
    const list = this.elbowData?.result?.inercias || [];
    if (list.length === 0) return [];

    let minInercia = Infinity, maxInercia = -Infinity;
    list.forEach(p => {
      if (p.inercia < minInercia) minInercia = p.inercia;
      if (p.inercia > maxInercia) maxInercia = p.inercia;
    });

    const rangeY = maxInercia - minInercia || 1;
    const width = 500;
    const height = 200;
    const padding = 35;
    const minK = 2;
    const maxK = Math.max(...list.map(p => p.k)) || 10;
    const rangeK = maxK - minK || 1;

    return list.map(item => {
      const cx = padding + ((item.k - minK) / rangeK) * (width - 2 * padding);
      const cy = height - (padding + ((item.inercia - minInercia) / rangeY) * (height - 2 * padding));
      return {
        k: item.k,
        inercia: item.inercia,
        cx,
        cy
      };
    });
  }

  get elbowPolylineString(): string {
    return this.elbowSvgPoints.map(p => `${p.cx},${p.cy}`).join(' ');
  }

  executeAlgorithm() {
    this.isLoading = true;
    this.errorMessage = '';
    const inicioMs = Date.now();

    if (this.selectedAlgorithmId === 'kmeans') {
      const payload = {
        k: Number(this.kValue),
        incluirPCA: this.incluirPCA,
        ids: this.personaIdsSeleccionadas,
        questions: this.preguntaIdsSeleccionadas
      };

      this.algorithmService.executeKMeans(payload).subscribe({
        next: (res) => {
          this.kmeansData = res;
          this.isLoading = false;

          // Registrar el log de bitácora de actividad en el estado
          const logBitacora = {
            fecha: new Date(),
            algoritmo: 'K-Means',
            totalPersonas: payload.ids.length || this.personas.length || 'Todas',
            totalPreguntas: payload.questions.length || this.preguntas.length || 'Todas',
            parametros: { k: payload.k, pca: payload.incluirPCA },
            tiempoRespuestaMs: Date.now() - inicioMs
          };
          this.bitacoraLogs.unshift(logBitacora);
        },
        error: (err) => {
          this.errorMessage = err?.error?.error || err?.error?.message || 'Error al ejecutar K-Means en el backend.';
          this.isLoading = false;
        }
      });
    } else if (this.selectedAlgorithmId === 'jerarquico') {
      const payload = {
        metodoEnlace: this.metodoEnlace,
        nClusters: Number(this.nClusters),
        incluirPCA: this.incluirPCA,
        ids: this.personaIdsSeleccionadas,
        questions: this.preguntaIdsSeleccionadas
      };

      this.algorithmService.executeHierarchical(payload).subscribe({
        next: (res) => {
          this.hierarchicalData = res;
          this.isLoading = false;

          // Registrar el log de bitácora de actividad en el estado
          const logBitacora = {
            fecha: new Date(),
            algoritmo: 'Clusterización Jerárquica',
            totalPersonas: payload.ids.length || this.personas.length || 'Todas',
            totalPreguntas: payload.questions.length || this.preguntas.length || 'Todas',
            parametros: { metodoEnlace: payload.metodoEnlace, nClusters: payload.nClusters },
            tiempoRespuestaMs: Date.now() - inicioMs
          };
          this.bitacoraLogs.unshift(logBitacora);
        },
        error: (err) => {
          this.errorMessage = err?.error?.error || err?.error?.message || 'Error al ejecutar la Clusterización Jerárquica.';
          this.isLoading = false;
        }
      });
    }
  }
}
