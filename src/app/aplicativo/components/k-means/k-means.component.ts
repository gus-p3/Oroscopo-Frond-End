import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KMeansResultResponse } from '../../../services/algorithm.service';

export interface PcaPoint {
  x: number;
  y: number;
  cx: number;
  cy: number;
  cluster: number;
  color: string;
  name: string;
  extraInfo?: string;
}

export interface ClusterSummary {
  clusterId: number;
  count: number;
  percentage: number;
  color: string;
  items: any[];
}

export interface ClusterMajoritySummary {
  clusterId: number;
  color: string;
  totalPersonas: number;
  elementoRealMax: string;
  elementoRealCount: number;
  elementoCalculadoMax: string;
  elementoCalculadoCount: number;
  coincidenMayorias: boolean;
}

const CLUSTER_COLORS = [
  '#7C3AED', // Púrpura
  '#06B6D4', // Cian
  '#F59E0B', // Dorado
  '#10B981', // Esmeralda
  '#EC4899', // Rosa
  '#3B82F6', // Azul
  '#8B5CF6'  // Violeta
];

import { PersonaDetailComponent } from '../persona-detail/persona-detail.component';

const ELEMENTOS = ['Fuego', 'Agua', 'Tierra', 'Aire'];

@Component({
  selector: 'app-k-means',
  standalone: true,
  imports: [CommonModule, FormsModule, PersonaDetailComponent],
  templateUrl: './k-means.component.html',
  styleUrl: './k-means.component.css',
})
export class KMeansComponent {
  @Input() data: KMeansResultResponse | null = null;
  @Input() loading: boolean = false;

  Math = Math;
  elementosOptions = ELEMENTOS;

  // Estado del Panel Lateral (Offcanvas Drawer)
  selectedPersonaId: string | null = null;

  openPersonaDetail(id: string) {
    if (id) {
      this.selectedPersonaId = id;
    }
  }

  closePersonaDetail() {
    this.selectedPersonaId = null;
  }

  // Estado de Filtros de la Tabla
  selectedClusterTab: number | 'all' = 'all';
  searchTerm: string = '';
  filterGender: string = 'all';
  filterElementReal: string = 'all';
  filterElementCalc: string = 'all';
  filterCoincidence: string = 'all';

  // Estado de Paginación
  pageSize: number = 10;
  currentPage: number = 1;
  pageSizeOptions: number[] = [5, 10, 15, 20, 50];

  selectClusterTab(tab: number | 'all') {
    this.selectedClusterTab = tab;
    this.currentPage = 1;
  }

  onPageSizeChange(newSize: number) {
    this.pageSize = Number(newSize);
    this.currentPage = 1;
  }

  onFilterChange() {
    this.currentPage = 1;
  }

  resetFilters() {
    this.searchTerm = '';
    this.filterGender = 'all';
    this.filterElementReal = 'all';
    this.filterElementCalc = 'all';
    this.filterCoincidence = 'all';
    this.currentPage = 1;
  }

  get tableRows(): any[] {
    if (!this.data?.personas) return [];

    return this.data.personas.filter(p => {
      // 1. Filtro por Tab de Cluster
      if (this.selectedClusterTab !== 'all' && p.cluster !== this.selectedClusterTab) {
        return false;
      }

      // 2. Buscador por nombre
      if (this.searchTerm.trim()) {
        const term = this.searchTerm.toLowerCase().trim();
        const name = (p.nombre || '').toLowerCase();
        if (!name.includes(term)) return false;
      }

      // 3. Filtro por Género
      if (this.filterGender !== 'all') {
        const gender = (p.genero || '').toLowerCase();
        if (!gender.includes(this.filterGender.toLowerCase())) return false;
      }

      // 4. Filtro por Elemento Real (Signo)
      if (this.filterElementReal !== 'all') {
        const el = (p.elementoSigno || '').toLowerCase();
        if (!el.includes(this.filterElementReal.toLowerCase())) return false;
      }

      // 5. Filtro por Elemento Calculado (Encuesta)
      if (this.filterElementCalc !== 'all') {
        const el = (p.elementoEncuesta || p.elementoPredominanteId || '').toLowerCase();
        if (!el.includes(this.filterElementCalc.toLowerCase())) return false;
      }

      // 6. Filtro por Coincidencia
      if (this.filterCoincidence === 'match') {
        const elSigno = (p.elementoSigno || '').trim().toLowerCase();
        const elEncuesta = (p.elementoEncuesta || p.elementoPredominanteId || '').trim().toLowerCase();
        if (!elSigno || !elEncuesta || elSigno !== elEncuesta) return false;
      } else if (this.filterCoincidence === 'diff') {
        const elSigno = (p.elementoSigno || '').trim().toLowerCase();
        const elEncuesta = (p.elementoEncuesta || p.elementoPredominanteId || '').trim().toLowerCase();
        if (elSigno && elEncuesta && elSigno === elEncuesta) return false;
      }

      return true;
    });
  }

  get totalRowsCount(): number {
    return this.tableRows.length;
  }

  get totalPages(): number {
    return Math.ceil(this.totalRowsCount / this.pageSize) || 1;
  }

  get paginatedRows(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.tableRows.slice(start, start + this.pageSize);
  }

  get pageStart(): number {
    return this.totalRowsCount === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRowsCount);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get pagesArray(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  getClusterColor(clusterId: number): string {
    return CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length];
  }

  get clustersList(): ClusterSummary[] {
    if (!this.data) return [];

    const labels = this.data.result?.labels || [];
    const personas = this.data.personas || [];
    const total = personas.length || labels.length || 1;

    const grouped: { [key: number]: any[] } = {};

    if (personas.length > 0) {
      personas.forEach(p => {
        const c = p.cluster ?? 0;
        if (!grouped[c]) grouped[c] = [];
        grouped[c].push(p);
      });
    } else {
      labels.forEach((c, idx) => {
        if (!grouped[c]) grouped[c] = [];
        grouped[c].push({ _id: `id_${idx}`, nombre: `Muestra ${idx + 1}`, cluster: c });
      });
    }

    return Object.keys(grouped).map(key => {
      const clusterId = Number(key);
      const items = grouped[clusterId];
      return {
        clusterId,
        count: items.length,
        percentage: Math.round((items.length / total) * 100),
        color: this.getClusterColor(clusterId),
        items
      };
    });
  }

  // ==================== GRÁFICAS DE PUNTOS (SCATTER PLOTS) ====================

  // 📍 GRÁFICA DE PUNTOS 1: PCA 2D (Plano Principal PC1 vs PC2)
  get pcaPoints(): PcaPoint[] {
    const coords = this.data?.result?.pca2d || this.data?.result?.pca_2d;
    if (!coords || coords.length === 0) return [];

    const labels = this.data?.result?.labels || [];
    const personas = this.data?.personas || [];

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    coords.forEach(([x, y]) => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const width = 560;
    const height = 280;
    const padding = 35;

    return coords.map(([x, y], idx) => {
      const cluster = labels[idx] ?? personas[idx]?.cluster ?? 0;
      const cx = padding + ((x - minX) / rangeX) * (width - 2 * padding);
      const cy = height - (padding + ((y - minY) / rangeY) * (height - 2 * padding));
      const name = personas[idx]?.nombre || `Muestra ${idx + 1}`;
      return {
        x, y, cx, cy, cluster,
        color: this.getClusterColor(cluster),
        name,
        extraInfo: `(PC1: ${x.toFixed(2)}, PC2: ${y.toFixed(2)})`
      };
    });
  }

  // 🎯 GRÁFICA DE PUNTOS 2: Dispersión Distancia al Centroide del Cluster
  get centroidDistancePoints(): PcaPoint[] {
    const coords = this.data?.result?.pca2d || this.data?.result?.pca_2d;
    if (!coords || coords.length === 0) return [];

    const labels = this.data?.result?.labels || [];
    const personas = this.data?.personas || [];

    const centroidMap: { [key: number]: { sumX: number; sumY: number; count: number } } = {};
    coords.forEach(([x, y], idx) => {
      const c = labels[idx] ?? personas[idx]?.cluster ?? 0;
      if (!centroidMap[c]) centroidMap[c] = { sumX: 0, sumY: 0, count: 0 };
      centroidMap[c].sumX += x;
      centroidMap[c].sumY += y;
      centroidMap[c].count++;
    });

    const computedDistances: { x: number; dist: number; cluster: number; name: string }[] = [];
    let minX = Infinity, maxX = -Infinity, minDist = Infinity, maxDist = -Infinity;

    coords.forEach(([x, y], idx) => {
      const c = labels[idx] ?? personas[idx]?.cluster ?? 0;
      const cen = centroidMap[c] || { sumX: 0, sumY: 0, count: 1 };
      const cenX = cen.sumX / cen.count;
      const cenY = cen.sumY / cen.count;

      const dist = Math.sqrt(Math.pow(x - cenX, 2) + Math.pow(y - cenY, 2));
      const name = personas[idx]?.nombre || `Muestra ${idx + 1}`;

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (dist < minDist) minDist = dist;
      if (dist > maxDist) maxDist = dist;

      computedDistances.push({ x, dist, cluster: c, name });
    });

    const rangeX = maxX - minX || 1;
    const rangeDist = maxDist - minDist || 1;
    const width = 560;
    const height = 280;
    const padding = 35;

    return computedDistances.map(item => {
      const cx = padding + ((item.x - minX) / rangeX) * (width - 2 * padding);
      const cy = height - (padding + ((item.dist - minDist) / rangeDist) * (height - 2 * padding));
      return {
        x: item.x,
        y: item.dist,
        cx,
        cy,
        cluster: item.cluster,
        color: this.getClusterColor(item.cluster),
        name: item.name,
        extraInfo: `Distancia al Centroide: ${item.dist.toFixed(2)}`
      };
    });
  }

  // 🔥 GRÁFICA DE PUNTOS 3: Matriz de Dispersión (Elemento Real vs Elemento Calculado)
  get zodiacVsElementPoints(): PcaPoint[] {
    const personas = this.data?.personas || [];
    if (personas.length === 0) return [];

    const rawPoints: { x: number; y: number; cluster: number; name: string; extra: string }[] = [];

    personas.forEach((p, idx) => {
      const elSignoName = (p.elementoSigno || '').trim().toLowerCase();
      let xVal = 0;
      if (elSignoName.includes('fuego')) xVal = 0;
      else if (elSignoName.includes('agua')) xVal = 1;
      else if (elSignoName.includes('tierra')) xVal = 2;
      else if (elSignoName.includes('aire')) xVal = 3;

      const elEncuestaName = (p.elementoEncuesta || p.elementoPredominanteId || p.elementoSigno || '').trim().toLowerCase();
      let yVal = 0;
      if (elEncuestaName.includes('fuego')) yVal = 0;
      else if (elEncuestaName.includes('agua')) yVal = 1;
      else if (elEncuestaName.includes('tierra')) yVal = 2;
      else if (elEncuestaName.includes('aire')) yVal = 3;

      const jitterX = ((idx * 7) % 10 - 5) * 0.05;
      const jitterY = ((idx * 13) % 10 - 5) * 0.05;

      rawPoints.push({
        x: xVal + jitterX,
        y: yVal + jitterY,
        cluster: p.cluster ?? 0,
        name: p.nombre,
        extra: `Elem. Real: ${p.elementoSigno || 'N/A'}, Elem. Encuesta: ${p.elementoEncuesta || 'N/A'}`
      });
    });

    const width = 560;
    const height = 280;
    const padding = 45;

    return rawPoints.map(p => {
      const cx = padding + (p.x / 3) * (width - 2 * padding);
      const cy = height - (padding + (p.y / 3) * (height - 2 * padding));
      return {
        x: p.x,
        y: p.y,
        cx,
        cy,
        cluster: p.cluster,
        color: this.getClusterColor(p.cluster),
        name: p.name,
        extraInfo: p.extra
      };
    });
  }

  // 🔄 GRÁFICA DE PUNTOS 4: Rotación Ortogonal 2D (PC2 vs PC1 Invertido)
  get rotatedPcaPoints(): PcaPoint[] {
    const coords = this.data?.result?.pca2d || this.data?.result?.pca_2d;
    if (!coords || coords.length === 0) return [];

    const labels = this.data?.result?.labels || [];
    const personas = this.data?.personas || [];

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    coords.forEach(([x, y]) => {
      const rx = y;
      const ry = -x;
      if (rx < minX) minX = rx;
      if (rx > maxX) maxX = rx;
      if (ry < minY) minY = ry;
      if (ry > maxY) maxY = ry;
    });

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const width = 560;
    const height = 280;
    const padding = 35;

    return coords.map(([x, y], idx) => {
      const rx = y;
      const ry = -x;
      const cluster = labels[idx] ?? personas[idx]?.cluster ?? 0;
      const cx = padding + ((rx - minX) / rangeX) * (width - 2 * padding);
      const cy = height - (padding + ((ry - minY) / rangeY) * (height - 2 * padding));
      const name = personas[idx]?.nombre || `Muestra ${idx + 1}`;
      return {
        x: rx,
        y: ry,
        cx,
        cy,
        cluster,
        color: this.getClusterColor(cluster),
        name,
        extraInfo: `Ángulo Eje (PC2: ${rx.toFixed(2)}, -PC1: ${ry.toFixed(2)})`
      };
    });
  }

  // ==================== GRÁFICAS ESTADÍSTICAS Y DISTRIBUCIÓN ====================

  // Gráfica Estadística A: Desglose por Elementos en cada Cluster
  get elementDistributionByCluster(): { clusterId: number; color: string; fuego: number; agua: number; tierra: number; aire: number; total: number }[] {
    if (!this.data?.personas) return [];

    const grouped: { [key: number]: { fuego: number; agua: number; tierra: number; aire: number; total: number } } = {};

    this.data.personas.forEach(p => {
      const c = p.cluster ?? 0;
      if (!grouped[c]) grouped[c] = { fuego: 0, agua: 0, tierra: 0, aire: 0, total: 0 };

      const el = (p.elementoEncuesta || p.elementoPredominanteId || p.elementoSigno || '').toLowerCase();
      if (el.includes('fuego')) grouped[c].fuego++;
      else if (el.includes('agua')) grouped[c].agua++;
      else if (el.includes('tierra')) grouped[c].tierra++;
      else if (el.includes('aire')) grouped[c].aire++;
      else grouped[c].fuego++;
      grouped[c].total++;
    });

    return Object.keys(grouped).map(key => {
      const clusterId = Number(key);
      return {
        clusterId,
        color: this.getClusterColor(clusterId),
        ...grouped[clusterId]
      };
    });
  }

  // Gráfica Estadística B: Afinidad de Género por Cluster
  get genderDistributionByCluster(): { clusterId: number; color: string; masculino: number; femenino: number; otro: number; total: number }[] {
    if (!this.data?.personas) return [];

    const grouped: { [key: number]: { masculino: number; femenino: number; otro: number; total: number } } = {};

    this.data.personas.forEach(p => {
      const c = p.cluster ?? 0;
      if (!grouped[c]) grouped[c] = { masculino: 0, femenino: 0, otro: 0, total: 0 };

      const g = (p.genero || '').toLowerCase();
      if (g.includes('masculino') || g === 'm' || g === 'hombre') grouped[c].masculino++;
      else if (g.includes('femenino') || g === 'f' || g === 'mujer') grouped[c].femenino++;
      else grouped[c].otro++;
      grouped[c].total++;
    });

    return Object.keys(grouped).map(key => {
      const clusterId = Number(key);
      return {
        clusterId,
        color: this.getClusterColor(clusterId),
        ...grouped[clusterId]
      };
    });
  }

  // Gráfica Estadística C: Coincidencia de Elementos (Signo vs Encuesta)
  get elementCoincidenceSummary() {
    if (!this.data?.personas || this.data.personas.length === 0) {
      return { coincidentes: 0, divergentes: 0, porcentajeCoincidencia: 0 };
    }

    let coincidentes = 0;
    let divergentes = 0;

    this.data.personas.forEach(p => {
      const elSigno = (p.elementoSigno || '').trim().toLowerCase();
      const elEncuesta = (p.elementoEncuesta || p.elementoPredominanteId || '').trim().toLowerCase();

      if (elSigno && elEncuesta && elSigno === elEncuesta) {
        coincidentes++;
      } else {
        divergentes++;
      }
    });

    const total = coincidentes + divergentes || 1;
    return {
      coincidentes,
      divergentes,
      porcentajeCoincidencia: Math.round((coincidentes / total) * 100)
    };
  }

  // 👑 Gráfica Estadística D: Elemento Mayoritario por Cluster (Real vs Calculado)
  get clusterMajorities(): ClusterMajoritySummary[] {
    if (!this.data?.personas) return [];

    const grouped: { 
      [key: number]: { 
        real: { fuego: number; agua: number; tierra: number; aire: number };
        calc: { fuego: number; agua: number; tierra: number; aire: number };
        total: number;
      } 
    } = {};

    this.data.personas.forEach(p => {
      const c = p.cluster ?? 0;
      if (!grouped[c]) {
        grouped[c] = {
          real: { fuego: 0, agua: 0, tierra: 0, aire: 0 },
          calc: { fuego: 0, agua: 0, tierra: 0, aire: 0 },
          total: 0
        };
      }

      // Elemento Real (Signo Astrológico)
      const elSigno = (p.elementoSigno || '').toLowerCase();
      if (elSigno.includes('fuego')) grouped[c].real.fuego++;
      else if (elSigno.includes('agua')) grouped[c].real.agua++;
      else if (elSigno.includes('tierra')) grouped[c].real.tierra++;
      else if (elSigno.includes('aire')) grouped[c].real.aire++;

      // Elemento Calculado (Respuestas Cuestionario)
      const elEncuesta = (p.elementoEncuesta || p.elementoPredominanteId || '').toLowerCase();
      if (elEncuesta.includes('fuego')) grouped[c].calc.fuego++;
      else if (elEncuesta.includes('agua')) grouped[c].calc.agua++;
      else if (elEncuesta.includes('tierra')) grouped[c].calc.tierra++;
      else if (elEncuesta.includes('aire')) grouped[c].calc.aire++;

      grouped[c].total++;
    });

    const getDominant = (counts: { fuego: number; agua: number; tierra: number; aire: number }) => {
      const entries = [
        { name: '🔥 Fuego', count: counts.fuego, key: 'fuego' },
        { name: '🌊 Agua', count: counts.agua, key: 'agua' },
        { name: '⛰️ Tierra', count: counts.tierra, key: 'tierra' },
        { name: '🍃 Aire', count: counts.aire, key: 'aire' },
      ];
      entries.sort((a, b) => b.count - a.count);
      return entries[0];
    };

    return Object.keys(grouped).map(key => {
      const clusterId = Number(key);
      const item = grouped[clusterId];
      const domReal = getDominant(item.real);
      const domCalc = getDominant(item.calc);

      return {
        clusterId,
        color: this.getClusterColor(clusterId),
        totalPersonas: item.total,
        elementoRealMax: domReal.name,
        elementoRealCount: domReal.count,
        elementoCalculadoMax: domCalc.name,
        elementoCalculadoCount: domCalc.count,
        coincidenMayorias: domReal.key === domCalc.key
      };
    });
  }
}
