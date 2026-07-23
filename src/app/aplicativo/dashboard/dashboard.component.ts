import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavBarComponent } from '../nav-bar/nav-bar.component';
import { SelectAlgoritmComponent, AlgoritmItem } from '../components/select-algoritm/select-algoritm.component';
import { KMeansComponent } from '../components/k-means/k-means.component';
import { AlgorithmService, KMeansResultResponse, HierarchicalResultResponse, ElbowResultResponse } from '../../services/algorithm.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    NavBarComponent, 
    SelectAlgoritmComponent, 
    KMeansComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  private algorithmService = inject(AlgorithmService);

  // Fase activa en el dashboard (fase1, fase2, fase3, fase4)
  currentPhase: string = 'fase3';

  selectedAlgorithmId: string = 'kmeans';
  selectedAlgorithmName: string = 'K-Means Clustering';
  
  // Parámetros de formulario para K-Means
  kValue: number = 3;
  incluirPCA: boolean = true;

  // Parámetros para Clusterización Jerárquica
  metodoEnlace: 'ward' | 'average' | 'complete' = 'ward';

  // Estados de ejecución
  isLoading: boolean = false;
  errorMessage: string = '';

  // Respuestas del Backend
  kmeansData: KMeansResultResponse | null = null;
  hierarchicalData: HierarchicalResultResponse | null = null;

  // Estado Método del Codo
  isCalculatingElbow: boolean = false;
  elbowData: ElbowResultResponse | null = null;

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
    this.algorithmService.executeElbow(10).subscribe({
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

    if (this.selectedAlgorithmId === 'kmeans') {
      this.algorithmService.executeKMeans({
        k: Number(this.kValue),
        incluirPCA: this.incluirPCA
      }).subscribe({
        next: (res) => {
          this.kmeansData = res;
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = err?.error?.error || err?.error?.message || 'Error al ejecutar K-Means en el backend.';
          this.isLoading = false;
        }
      });
    } else if (this.selectedAlgorithmId === 'jerarquico') {
      this.algorithmService.executeHierarchical({
        metodoEnlace: this.metodoEnlace
      }).subscribe({
        next: (res) => {
          this.hierarchicalData = res;
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = err?.error?.error || err?.error?.message || 'Error al ejecutar la Clusterización Jerárquica.';
          this.isLoading = false;
        }
      });
    }
  }
}
