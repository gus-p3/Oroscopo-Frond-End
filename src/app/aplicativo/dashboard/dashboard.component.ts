import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavBarComponent } from '../nav-bar/nav-bar.component';
import { SelectAlgoritmComponent, AlgoritmItem } from '../components/select-algoritm/select-algoritm.component';
import { KMeansComponent } from '../components/k-means/k-means.component';
import { HierarchicalComponent } from '../components/hierarchical/hierarchical.component';
import { AlgorithmService, KMeansResultResponse, HierarchicalResultResponse, ElbowResultResponse, KMeansParams, HierarchicalParams } from '../../services/algorithm.service';
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

  // Fase activa en el dashboard
  currentPhase: string = 'fase1';

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
  currentBitacoraPayload: any = null;
  currentBitacoraDisplay: any = null;
  isSavingBitacora: boolean = false;
  bitacoraSuccessMessage: string = '';

  // Estado de Importación CSV
  isImporting: boolean = false;
  importSuccessMessage: string = '';
  importSummary: any = null;
  isUsingImportedData: boolean = false;
  importedPersonas: any[] = [];

  ngOnInit() {
    this.cargarHistorialBitacora();
    // Cargar catálogos para filtros
    this.apiService.getCatalogos().subscribe({
      next: (res) => {
        this.signos = res.signos || [];
      }
    });

    // No cargamos personas desde DB para mostrar, solo del CSV.
    this.cargarPersonas();

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

  cargarPersonas() {
    this.personas = [];
    this.personasFiltradas = [];
    this.personaIdsSeleccionadas = [];
  }

  importarPersonasCSV(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.isImporting = true;
    this.errorMessage = '';
    this.importSuccessMessage = '';
    this.importSummary = null;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const csvText = e.target.result;
      this.apiService.importarCSV(csvText).subscribe({
        next: (res: any[]) => {
          this.isImporting = false;
          this.importedPersonas = (res || []).map(p => ({
            ...p,
            _id: p.tempId,
            id: p.tempId
          }));
          this.isUsingImportedData = true;

          const validos = this.importedPersonas.filter(p => p.valido);
          const invalidos = this.importedPersonas.filter(p => !p.valido);

          // Por defecto seleccionamos todas las personas válidas
          this.personaIdsSeleccionadas = validos.map(p => p.tempId);
          this.importSuccessMessage = `Registros válidos: ${validos.length}, con inconsistencias: ${invalidos.length}. Los válidos están seleccionados por defecto. Puedes revisar todos en la tabla.`;
          
          this.importSummary = {
            totalProcesados: this.importedPersonas.length,
            totalValidos: validos.length,
            totalInvalidos: invalidos.length,
            detallesErrores: invalidos.map((p, idx) => ({
              rowNumber: idx + 1,
              nombre: p.nombre,
              errores: p.errores
            }))
          };

          this.filtrarPersonas();
          event.target.value = '';
        },
        error: (err) => {
          this.isImporting = false;
          this.errorMessage = err?.error?.message || 'Error al importar archivo CSV.';
          event.target.value = '';
        }
      });
    };
    reader.readAsText(file);
  }

  ignorarInconsistentes() {
    if (!this.isUsingImportedData) return;
    const invalidIds = this.importedPersonas.filter(p => !p.valido).map(p => p.tempId);
    this.personaIdsSeleccionadas = this.personaIdsSeleccionadas.filter(id => !invalidIds.includes(id));
  }

  restaurarBaseDatos() {
    this.isUsingImportedData = false;
    this.importedPersonas = [];
    this.personasFiltradas = [];
    this.personaIdsSeleccionadas = [];
    this.importSuccessMessage = '';
    this.importSummary = null;
  }

  getCustomDatasetPayload() {
    if (!this.isUsingImportedData) return null;

    const selectedPersonas = this.importedPersonas.filter(p => this.personaIdsSeleccionadas.includes(p.tempId));
    
    const dataset = selectedPersonas.map(p => {
      const row: any = {};
      this.preguntaIdsSeleccionadas.forEach(qId => {
        if (p.respuestas[qId] !== undefined) {
          row[qId] = p.respuestas[qId];
        }
      });
      return row;
    });

    const ids = selectedPersonas.map(p => p.tempId);
    
    const personasMapped = selectedPersonas.map(p => {
      // Map respuestas to aspects using Cached questions
      const aspectosMap = new Map<string, number>();
      this.preguntas.forEach(q => {
        const val = p.respuestas[q._id];
        if (val !== undefined && (q as any).aspectoNombre) {
          aspectosMap.set((q as any).aspectoNombre, val);
        }
      });

      // Map puntajes to array entries format
      const puntajesElementos = Object.entries(p.puntajes || {});

      return {
        _id: p.tempId,
        id: p.tempId,
        nombre: p.nombre,
        genero: p.genero,
        signoZodiacal: p.signoZodiacal,
        elementoSigno: p.elementoSigno,
        elementoPredominante: p.elementoPredominante,
        elementoEncuesta: p.elementoPredominante,
        elementoPredominanteId: p.elementoPredominante,
        elementoNombre: p.elementoPredominante,
        puntajes: p.puntajes || {},
        puntajesElementos,
        aspectos: Array.from(aspectosMap.entries())
      };
    });

    return {
      dataset,
      ids,
      personas: personasMapped
    };
  }

  cargarHistorialBitacora() {
    this.apiService.getBitacora().subscribe({
      next: (res) => {
        this.bitacoraLogs = res.map((b: any) => ({
          _id: b._id,
          fecha: b.fecha,
          algoritmo: b.algoritmo === 'kmeans' ? 'K-Means' : 'Clusterización Jerárquica',
          totalPersonas: b.filtrosDataset?.totalRegistros || 'Todas',
          totalPreguntas: b.filtrosDataset?.totalPreguntas || 'Todas',
          preguntasDetalle: b.filtrosDataset?.preguntasDetalle || '',
          parametros: b.algoritmo === 'kmeans' 
            ? { k: b.parametrosUsados?.k, pca: b.parametrosUsados?.incluirPCA } 
            : { metodoEnlace: b.parametrosUsados?.metodoEnlace, nClusters: b.parametrosUsados?.nClusters },
          tiempoRespuestaMs: '-', // No está en DB, se muestra para nuevas
          resultadoCompleto: b.resultadoCompleto
        }));
      },
      error: (err) => console.error('Error al cargar bitácora', err)
    });
  }

  verResultadosHistoricos(log: any) {
    this.errorMessage = '';
    this.isLoading = true;
    
    // Simular un pequeño tiempo de carga visual
    setTimeout(() => {
      if (log.algoritmo === 'K-Means' || log.algoritmo === 'kmeans') {
        this.selectedAlgorithmId = 'kmeans';
        this.selectedAlgorithmName = 'K-Means Clustering';
        this.kmeansData = log.resultadoCompleto;
        this.hierarchicalData = null;
      } else {
        this.selectedAlgorithmId = 'jerarquico';
        this.selectedAlgorithmName = 'Clusterización Jerárquica';
        this.hierarchicalData = log.resultadoCompleto;
        this.kmeansData = null;
      }
      
      this.isLoading = false;
      this.onPhaseChange('fase4');
    }, 300);
  }

  filtrarPersonas() {
    const listToFilter = this.isUsingImportedData ? this.importedPersonas : this.personas;
    this.personasFiltradas = listToFilter.filter(p => {
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
    
    const customDataset = this.isUsingImportedData ? this.getCustomDatasetPayload() : null;

    this.algorithmService.executeElbow(10, this.personaIdsSeleccionadas, this.preguntaIdsSeleccionadas, customDataset).subscribe({
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
      const payload: KMeansParams = {
        k: Number(this.kValue),
        incluirPCA: this.incluirPCA,
        ids: this.personaIdsSeleccionadas,
        questions: this.preguntaIdsSeleccionadas
      };

      if (this.isUsingImportedData) {
        payload.customDataset = this.getCustomDatasetPayload();
      }

      this.algorithmService.executeKMeans(payload).subscribe({
        next: (res) => {
          this.kmeansData = res;
          this.isLoading = false;

          const clusterSizes: Record<number, number> = {};
          if (res.result && res.result.labels) {
            for (const label of res.result.labels) {
              clusterSizes[label] = (clusterSizes[label] || 0) + 1;
            }
          }
          
          const preguntasUsadas = this.preguntas.filter(q => payload.questions!.includes(q._id));
          const preguntasDetalle = preguntasUsadas.map(q => `P${q.numero}`).join(', ');

          this.currentBitacoraPayload = {
            algoritmo: 'kmeans',
            parametrosUsados: { k: payload.k, incluirPCA: payload.incluirPCA },
            filtrosDataset: { totalRegistros: payload.ids!.length, totalPreguntas: payload.questions!.length, preguntasDetalle },
            resumenResultados: {
                numClusters: payload.k,
                inercia: res.result.inercia,
                clusterSizes
            },
            resultadoCompleto: res
          };

          this.currentBitacoraDisplay = {
            fecha: new Date(),
            algoritmo: 'K-Means',
            totalPersonas: payload.ids!.length || this.personas.length || 'Todas',
            totalPreguntas: payload.questions!.length || this.preguntas.length || 'Todas',
            preguntasDetalle,
            parametros: { k: payload.k, pca: payload.incluirPCA },
            tiempoRespuestaMs: Date.now() - inicioMs,
            resultadoCompleto: res
          };
          this.bitacoraSuccessMessage = '';
        },
        error: (err) => {
          this.errorMessage = err?.error?.error || err?.error?.message || 'Error al ejecutar K-Means en el backend.';
          this.isLoading = false;
        }
      });
    } else if (this.selectedAlgorithmId === 'jerarquico') {
      const payload: HierarchicalParams = {
        metodoEnlace: this.metodoEnlace,
        incluirPCA: this.incluirPCA,
        ids: this.personaIdsSeleccionadas,
        questions: this.preguntaIdsSeleccionadas
      };

      if (this.isUsingImportedData) {
        payload.customDataset = this.getCustomDatasetPayload();
      }

      this.algorithmService.executeHierarchical(payload).subscribe({
        next: (res) => {
          this.hierarchicalData = res;
          this.isLoading = false;

          const clusterSizes: Record<number, number> = {};
          const labels = res.result.labels || [];
          for (const label of labels) {
            clusterSizes[label] = (clusterSizes[label] || 0) + 1;
          }

          const preguntasUsadas = this.preguntas.filter(q => payload.questions!.includes(q._id));
          const preguntasDetalle = preguntasUsadas.map(q => `P${q.numero}`).join(', ');

          this.currentBitacoraPayload = {
            algoritmo: 'jerarquico',
            parametrosUsados: { 
                metodoEnlace: payload.metodoEnlace,
                incluirPCA: payload.incluirPCA
            },
            filtrosDataset: { totalRegistros: payload.ids!.length, totalPreguntas: payload.questions!.length, preguntasDetalle },
            resumenResultados: {
                linkageMatrixLength: res.result.linkageMatrix?.length || res.result.linkage_matrix?.length || 0,
                metodoEnlace: payload.metodoEnlace,
                clusterSizes
            },
            resultadoCompleto: res
          };

          this.currentBitacoraDisplay = {
            fecha: new Date(),
            algoritmo: 'Clusterización Jerárquica',
            totalPersonas: payload.ids!.length || this.personas.length || 'Todas',
            totalPreguntas: payload.questions!.length || this.preguntas.length || 'Todas',
            preguntasDetalle,
            parametros: { metodoEnlace: payload.metodoEnlace },
            tiempoRespuestaMs: Date.now() - inicioMs,
            resultadoCompleto: res
          };
          this.bitacoraSuccessMessage = '';
        },
        error: (err) => {
          this.errorMessage = err?.error?.error || err?.error?.message || 'Error al ejecutar la Clusterización Jerárquica.';
          this.isLoading = false;
        }
      });
    }
  }

  saveCurrentBitacora() {
    if (!this.currentBitacoraPayload) return;
    this.isSavingBitacora = true;
    this.bitacoraSuccessMessage = '';
    
    this.apiService.saveBitacora(this.currentBitacoraPayload).subscribe({
      next: (res) => {
        this.isSavingBitacora = false;
        this.bitacoraSuccessMessage = '¡Bitácora guardada con éxito!';
        
        // Limpiar formulario y recargar historial desde la base de datos
        this.currentBitacoraPayload = null;
        this.currentBitacoraDisplay = null;
        this.cargarHistorialBitacora();
      },
      error: (err) => {
        this.isSavingBitacora = false;
        this.errorMessage = err?.error?.message || 'Error al guardar bitácora';
      }
    });
  }

  // ─── MÉTODOS DE EXPORTACIÓN (CSV / JSON CON PUNTAJES POR PREGUNTA) ─────────

  private downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  exportPersonasCSV() {
    this.exportDatasetCSV();
  }

  exportPersonasJSON() {
    this.exportDatasetJSON();
  }

  exportDatasetCSV() {
    const payload = {
      ids: this.personaIdsSeleccionadas,
      questions: this.preguntaIdsSeleccionadas,
      format: 'csv'
    };

    this.apiService.exportDataset(payload).subscribe({
      next: (blob: Blob) => {
        const dateStr = new Date().toISOString().split('T')[0];
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dataset_personas_puntajes_preguntas_${dateStr}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Error al exportar CSV:', err)
    });
  }

  exportDatasetJSON() {
    const payload = {
      ids: this.personaIdsSeleccionadas,
      questions: this.preguntaIdsSeleccionadas,
      format: 'json'
    };

    this.apiService.exportDataset(payload).subscribe({
      next: (data: any) => {
        const jsonContent = JSON.stringify(data, null, 2);
        const dateStr = new Date().toISOString().split('T')[0];
        this.downloadFile(jsonContent, `dataset_personas_puntajes_preguntas_${dateStr}.json`, 'application/json');
      },
      error: (err) => console.error('Error al exportar JSON:', err)
    });
  }

  // ─── MÉTODOS DE IMPORTACIÓN Y EXPORTACIÓN DE LA BITÁCORA ──────────────────

  exportBitacoraCSV() {
    if (this.bitacoraLogs.length === 0) return;
    const headers = ['Fecha', 'Algoritmo', 'Registros (Personas)', 'Dimensiones (Preguntas)', 'Parametros', 'Tiempo Respuesta (ms)'];
    const rows = this.bitacoraLogs.map(log => {
      const fechaStr = new Date(log.fecha).toLocaleString();
      const paramsStr = log.algoritmo === 'K-Means' || log.algoritmo === 'kmeans'
        ? `k=${log.parametros?.k || '-'};pca=${log.parametros?.pca ? 'Si' : 'No'}` 
        : `linkage=${log.parametros?.metodoEnlace || '-'}`;
      return [
        `"${fechaStr}"`,
        `"${log.algoritmo}"`,
        `"${log.totalPersonas}"`,
        `"${log.totalPreguntas}"`,
        `"${paramsStr}"`,
        `"${log.tiempoRespuestaMs || '-'}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    this.downloadFile(csvContent, `bitacora_completa_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  }

  exportBitacoraJSON() {
    if (this.bitacoraLogs.length === 0) return;
    const jsonContent = JSON.stringify(this.bitacoraLogs, null, 2);
    this.downloadFile(jsonContent, `bitacora_completa_${Date.now()}.json`, 'application/json');
  }

  exportSingleBitacoraCSV(log: any) {
    const headers = ['Fecha', 'Algoritmo', 'Registros (Personas)', 'Dimensiones (Preguntas)', 'Parametros', 'Tiempo Respuesta (ms)'];
    const fechaStr = new Date(log.fecha).toLocaleString();
    const paramsStr = log.algoritmo === 'K-Means' || log.algoritmo === 'kmeans'
      ? `k=${log.parametros?.k || '-'};pca=${log.parametros?.pca ? 'Si' : 'No'}` 
      : `linkage=${log.parametros?.metodoEnlace || '-'}`;
    const row = [
      `"${fechaStr}"`,
      `"${log.algoritmo}"`,
      `"${log.totalPersonas}"`,
      `"${log.totalPreguntas}"`,
      `"${paramsStr}"`,
      `"${log.tiempoRespuestaMs || '-'}"`
    ];

    const csvContent = [headers.join(','), row.join(',')].join('\n');
    const safeName = String(log.algoritmo).replace(/\s+/g, '_');
    this.downloadFile(csvContent, `bitacora_${safeName}_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  }

  exportSingleBitacoraJSON(log: any) {
    const jsonContent = JSON.stringify(log, null, 2);
    const safeName = String(log.algoritmo).replace(/\s+/g, '_');
    this.downloadFile(jsonContent, `bitacora_${safeName}_${Date.now()}.json`, 'application/json');
  }

  importBitacoraJSON(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const imported = JSON.parse(e.target.result);
        
        if (Array.isArray(imported)) {
          const validLogs = imported.filter(item => this.isValidLogStructure(item));
          if (validLogs.length === 0) throw new Error('Estructura de logs no válida en el archivo JSON.');
          
          this.bitacoraLogs = [...validLogs, ...this.bitacoraLogs];
          this.bitacoraSuccessMessage = `¡Se importaron ${validLogs.length} corridas con éxito!`;
        } else {
          if (!this.isValidLogStructure(imported)) throw new Error('Estructura de log no válida en el archivo JSON.');
          
          this.bitacoraLogs.unshift(imported);
          this.bitacoraSuccessMessage = '¡Se importó 1 corrida con éxito!';
        }
        
        event.target.value = '';
      } catch (err: any) {
        this.errorMessage = `Error al importar archivo JSON: ${err.message}`;
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  private isValidLogStructure(log: any): boolean {
    return log && typeof log === 'object' && log.fecha && log.algoritmo && log.resultadoCompleto;
  }
}
