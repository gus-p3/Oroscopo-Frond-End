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

  // Modelos Guardados
  savedModels: any[] = [];
  selectedSavedModelId: string = '';
  savedModelError: string = '';

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
  isUsingImportedData: boolean = true;
  importedPersonas: any[] = [];
  csvHeaders: string[] = [];
  camposSeleccionados: string[] = [];

  ngOnInit() {
    this.cargarHistorialBitacora();
    // Cargar catálogos para filtros con fallback estático para modo sin BD
    const fallbackSignos = [
      'Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo',
      'Libra', 'Escorpión', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis'
    ].map(n => ({ _id: n, nombre: n }));

    this.apiService.getCatalogos().subscribe({
      next: (res) => {
        this.signos = (res && res.signos && res.signos.length > 0) ? res.signos : fallbackSignos;
      },
      error: () => {
        this.signos = fallbackSignos;
      }
    });

    this.cargarPersonas();

    // Cargar las preguntas del cuestionario como fallback si no hay CSV
    this.apiService.getCuestionario().subscribe({
      next: (res) => {
        this.preguntas = res || [];
        if (this.camposSeleccionados.length === 0) {
          this.preguntaIdsSeleccionadas = this.preguntas.map(q => q._id);
        }
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

          if (this.importedPersonas.length > 0 && this.importedPersonas[0].rawRow) {
            this.csvHeaders = Object.keys(this.importedPersonas[0].rawRow);
            this.seleccionarSoloNumericos();
          } else {
            this.csvHeaders = [];
            this.camposSeleccionados = [];
          }

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
    this.csvHeaders = [];
    this.camposSeleccionados = [];
    this.personasFiltradas = [];
    this.personaIdsSeleccionadas = [];
    this.importSuccessMessage = '';
    this.importSummary = null;
  }

  // ─── SELECCIÓN DE CAMPOS DEL CSV ───────────────────────────────────────────
  isFieldSelected(field: string): boolean {
    return this.camposSeleccionados.includes(field);
  }

  toggleFieldSelection(field: string) {
    const idx = this.camposSeleccionados.indexOf(field);
    if (idx > -1) {
      this.camposSeleccionados.splice(idx, 1);
    } else {
      this.camposSeleccionados.push(field);
    }
  }

  toggleAllFields() {
    if (this.camposSeleccionados.length === this.csvHeaders.length) {
      this.camposSeleccionados = [];
    } else {
      this.camposSeleccionados = [...this.csvHeaders];
    }
  }

  seleccionarSoloNumericos() {
    if (!this.csvHeaders || this.csvHeaders.length === 0) return;
    this.camposSeleccionados = this.csvHeaders.filter(h => {
      if (['personaId', 'id', '_id', 'nombre', 'genero'].includes(h)) return false;
      if (!this.importedPersonas.length) return true;
      const firstRow = this.importedPersonas[0];
      const val = firstRow.rawRow ? firstRow.rawRow[h] : firstRow[h];
      return val !== undefined && val !== null && val !== '' && !isNaN(Number(val));
    });
    if (this.camposSeleccionados.length === 0) {
      this.camposSeleccionados = [...this.csvHeaders];
    }
  }

  getCustomDatasetPayload() {
    const selectedPersonas = this.importedPersonas.filter(p => this.personaIdsSeleccionadas.includes(p.tempId));
    const listToUse = selectedPersonas.length > 0 ? selectedPersonas : this.importedPersonas;
    const fieldsToUse = this.camposSeleccionados.length > 0 ? this.camposSeleccionados : this.csvHeaders;

    const dataset = listToUse.map(p => {
      const row: Record<string, number> = {};
      fieldsToUse.forEach(field => {
        let val: any = undefined;
        if (p.rawRow && p.rawRow[field] !== undefined) {
          val = p.rawRow[field];
        } else if (p[field] !== undefined) {
          val = p[field];
        } else if (p.puntajes && p.puntajes[field] !== undefined) {
          val = p.puntajes[field];
        } else if (p.respuestas && p.respuestas[field] !== undefined) {
          val = p.respuestas[field];
        }

        const num = Number(val);
        row[field] = isNaN(num) ? 0 : num;
      });
      return row;
    });

    const ids = listToUse.map(p => p.tempId);
    
    const personasMapped = listToUse.map(p => {
      return {
        _id: p.tempId,
        id: p.tempId,
        nombre: p.nombre || p.rawRow?.nombre || 'Persona',
        genero: p.genero || p.rawRow?.genero || 'N/A',
        signoZodiacal: p.signoZodiacal || p.rawRow?.signoZodiacal || p.rawRow?.signo || 'N/A',
        elementoSigno: p.elementoSigno || p.rawRow?.elementoSigno || 'N/A',
        elementoPredominante: p.elementoPredominante || p.rawRow?.elementoPredominante || 'N/A',
        elementoEncuesta: p.elementoPredominante || 'N/A',
        elementoPredominanteId: p.elementoPredominante || 'N/A',
        elementoNombre: p.elementoPredominante || 'N/A',
        puntajes: p.puntajes || {},
        puntajesElementos: Object.entries(p.puntajes || {}),
        aspectos: fieldsToUse.map(f => {
          const val = p.rawRow ? p.rawRow[f] : p[f];
          return [f, Number(val) || 0];
        })
      };
    });

    return {
      dataset,
      ids,
      personas: personasMapped
    };
  }

  showDisplayDimensions: boolean = false;
  expandedLogDimensions: Record<string, boolean> = {};

  toggleLogDimensions(logId: string) {
    this.expandedLogDimensions[logId] = !this.expandedLogDimensions[logId];
  }

  isLogDimensionsExpanded(logId: string): boolean {
    return !!this.expandedLogDimensions[logId];
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
          preguntasLista: b.filtrosDataset?.preguntasLista || [],
          parametros: b.algoritmo === 'kmeans' 
            ? { k: b.parametrosUsados?.k, pca: b.parametrosUsados?.incluirPCA } 
            : { metodoEnlace: b.parametrosUsados?.metodoEnlace, nClusters: b.parametrosUsados?.nClusters },
          tiempoRespuestaMs: '-', // No está en DB, se muestra para nuevas
          resultadoCompleto: b.resultadoCompleto,
          rutaModelo: b.rutaModelo,
          modeloOrigen: b.modeloOrigen || b.parametrosUsados?.modeloOrigenDetalle || 'Nuevo (desde cero)',
          raw: b
        }));
        this.savedModels = this.bitacoraLogs.filter(log => log.rutaModelo);
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

  // Mensaje de bloqueo de fase
  phaseBlockMessage: string = '';
  phaseBlockVisible: boolean = false;
  private phaseBlockTimer: any = null;

  get csvCargado(): boolean {
    return this.importedPersonas.length > 0;
  }

  get resultadosListos(): boolean {
    return !!(this.kmeansData || this.hierarchicalData);
  }

  onPhaseChange(phaseId: string) {
    // Fase 2 y 3 requieren CSV cargado
    if ((phaseId === 'fase2' || phaseId === 'fase3') && !this.csvCargado) {
      this.mostrarBloqueoFase('Primero debes cargar un dataset (CSV) en la Fase 1.');
      return;
    }
    // Fase 4 requiere resultados de algoritmo
    if (phaseId === 'fase4' && !this.resultadosListos) {
      this.mostrarBloqueoFase('La Fase 4 solo está disponible después de ejecutar un algoritmo o al ver resultados desde la Bitácora.');
      return;
    }
    this.currentPhase = phaseId;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  mostrarBloqueoFase(mensaje: string) {
    this.phaseBlockMessage = mensaje;
    this.phaseBlockVisible = true;
    if (this.phaseBlockTimer) clearTimeout(this.phaseBlockTimer);
    this.phaseBlockTimer = setTimeout(() => {
      this.phaseBlockVisible = false;
    }, 3500);
  }

  onAlgorithmSelected(algorithm: AlgoritmItem) {
    this.selectedAlgorithmId = algorithm.id;
    this.selectedAlgorithmName = algorithm.nombre;
    this.errorMessage = '';
    this.selectedSavedModelId = '';
    this.savedModelError = '';
  }

  onSavedModelChange() {
    this.savedModelError = '';
    if (!this.selectedSavedModelId) {
      return;
    }
    
    const log = this.savedModels.find(m => m._id === this.selectedSavedModelId);
    if (!log) return;

    // Verificar dimensiones (campos) usando el arreglo nativo o fallback a split
    let requiredFields: string[] = [];
    if (log.raw?.filtrosDataset?.preguntasLista && Array.isArray(log.raw.filtrosDataset.preguntasLista)) {
      requiredFields = log.raw.filtrosDataset.preguntasLista;
    } else if (log.preguntasLista && Array.isArray(log.preguntasLista)) {
      requiredFields = log.preguntasLista;
    } else if (log.raw?.filtrosDataset?.preguntasDetalle) {
      requiredFields = log.raw.filtrosDataset.preguntasDetalle.split(', ');
    } else if (log.preguntasDetalle) {
      requiredFields = log.preguntasDetalle.split(', ');
    }
    
    const fieldsUsed = this.camposSeleccionados.length > 0 ? this.camposSeleccionados : this.csvHeaders;
    
    const missing = requiredFields.filter((f: string) => !fieldsUsed.includes(f));
    
    if (missing.length > 0) {
      this.savedModelError = `El modelo guardado requiere dimensiones que no están seleccionadas en el dataset actual: ${missing.join(' | ')}. Por favor, ve a la Fase 2 y selecciónalas.`;
    } else {
      this.camposSeleccionados = [...requiredFields];
      this.savedModelError = '';
      
      // Update algorithm parameters
      if (this.selectedAlgorithmId === 'kmeans' && log.parametros) {
        this.kValue = log.parametros.k;
        this.incluirPCA = log.parametros.pca;
      } else if (this.selectedAlgorithmId === 'jerarquico' && log.parametros) {
        this.metodoEnlace = log.parametros.metodoEnlace;
        this.incluirPCA = log.parametros.pca !== undefined ? log.parametros.pca : true;
      }
    }
  }

  calculateElbow() {
    this.isCalculatingElbow = true;
    this.errorMessage = '';
    
    const customDataset = this.getCustomDatasetPayload();
    const fieldsUsed = this.camposSeleccionados.length > 0 ? this.camposSeleccionados : this.csvHeaders;

    this.algorithmService.executeElbow(10, this.personaIdsSeleccionadas, fieldsUsed, customDataset).subscribe({
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

    const fieldsUsed = this.camposSeleccionados.length > 0 ? this.camposSeleccionados : this.csvHeaders;
    const customDataset = this.getCustomDatasetPayload();
    const camposDetalle = fieldsUsed.join(', ');

    let modeloOrigenText = 'Nuevo (Modelo desde cero)';
    if (this.selectedSavedModelId) {
      const sourceLog = this.savedModels.find(m => m._id === this.selectedSavedModelId);
      if (sourceLog) {
        const fechaStr = sourceLog.fecha ? new Date(sourceLog.fecha).toLocaleString() : '';
        modeloOrigenText = `Reutilizado de: ${sourceLog.algoritmo} (${fechaStr || sourceLog._id.substring(0, 8)})`;
      }
    }

    if (this.selectedAlgorithmId === 'kmeans') {
      const kNum = Number(this.kValue);
      if (isNaN(kNum) || kNum < 2) {
        this.errorMessage = 'El número de clusters (K) debe ser un entero mayor o igual a 2.';
        this.isLoading = false;
        return;
      }

      const payload: KMeansParams = {
        k: kNum,
        incluirPCA: this.incluirPCA,
        ids: this.personaIdsSeleccionadas,
        questions: fieldsUsed,
        customDataset
      };
      
      if (this.selectedSavedModelId) {
        const log = this.savedModels.find(m => m._id === this.selectedSavedModelId);
        if (log) payload.rutaModelo = log.rutaModelo;
      }

      this.algorithmService.executeKMeans(payload).subscribe({
        next: (res) => {
          this.kmeansData = res;
          this.isLoading = false;
          this.currentPhase = 'fase4';

          const clusterSizes: Record<number, number> = {};
          if (res.result && res.result.labels) {
            for (const label of res.result.labels) {
              clusterSizes[label] = (clusterSizes[label] || 0) + 1;
            }
          }

          this.currentBitacoraPayload = {
            algoritmo: 'kmeans',
            parametrosUsados: { 
              k: payload.k, 
              incluirPCA: payload.incluirPCA,
              modeloOrigenId: this.selectedSavedModelId || null,
              modeloOrigenDetalle: modeloOrigenText
            },
            filtrosDataset: { 
              totalRegistros: (customDataset?.ids || []).length, 
              totalPreguntas: fieldsUsed.length, 
              preguntasDetalle: camposDetalle,
              preguntasLista: fieldsUsed
            },
            resumenResultados: {
                numClusters: payload.k,
                inercia: res.result.inercia,
                clusterSizes
            },
            resultadoCompleto: res,
            rutaModelo: res.result?.rutaModelo,
            modeloOrigen: modeloOrigenText
          };

          this.currentBitacoraDisplay = {
            fecha: new Date(),
            algoritmo: 'K-Means',
            totalPersonas: (customDataset?.ids || []).length || 'Todas',
            totalPreguntas: fieldsUsed.length || 'Todas',
            preguntasDetalle: camposDetalle,
            parametros: { k: payload.k, pca: payload.incluirPCA },
            modeloOrigen: modeloOrigenText,
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
        questions: fieldsUsed,
        customDataset
      };
      
      if (this.selectedSavedModelId) {
        const log = this.savedModels.find(m => m._id === this.selectedSavedModelId);
        if (log) payload.rutaModelo = log.rutaModelo;
      }

      this.algorithmService.executeHierarchical(payload).subscribe({
        next: (res) => {
          this.hierarchicalData = res;
          this.isLoading = false;
          this.currentPhase = 'fase4';

          const clusterSizes: Record<number, number> = {};
          const labels = res.result.labels || [];
          for (const label of labels) {
            clusterSizes[label] = (clusterSizes[label] || 0) + 1;
          }

          this.currentBitacoraPayload = {
            algoritmo: 'jerarquico',
            parametrosUsados: { 
                metodoEnlace: payload.metodoEnlace,
                incluirPCA: payload.incluirPCA,
                modeloOrigenId: this.selectedSavedModelId || null,
                modeloOrigenDetalle: modeloOrigenText
            },
            filtrosDataset: { 
              totalRegistros: (customDataset?.ids || []).length, 
              totalPreguntas: fieldsUsed.length, 
              preguntasDetalle: camposDetalle,
              preguntasLista: fieldsUsed
            },
            resumenResultados: {
                linkageMatrixLength: res.result.linkageMatrix?.length || res.result.linkage_matrix?.length || 0,
                metodoEnlace: payload.metodoEnlace,
                clusterSizes
            },
            resultadoCompleto: res,
            rutaModelo: res.result?.rutaModelo,
            modeloOrigen: modeloOrigenText
          };

          this.currentBitacoraDisplay = {
            fecha: new Date(),
            algoritmo: 'Clusterización Jerárquica',
            totalPersonas: (customDataset?.ids || []).length || 'Todas',
            totalPreguntas: fieldsUsed.length || 'Todas',
            preguntasDetalle: camposDetalle,
            parametros: { metodoEnlace: payload.metodoEnlace },
            modeloOrigen: modeloOrigenText,
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
    const selectedPersonas = this.importedPersonas.filter(p => this.personaIdsSeleccionadas.includes(p.tempId));
    const listToExport = selectedPersonas.length > 0 ? selectedPersonas : this.importedPersonas;
    if (listToExport.length === 0) return;

    const fieldsToExport = this.camposSeleccionados.length > 0 ? this.camposSeleccionados : this.csvHeaders;
    const headers = Array.from(new Set(['nombre', 'genero', 'signoZodiacal', ...fieldsToExport]));

    const rows = listToExport.map(p => {
      return headers.map(h => {
        let val = '';
        if (p.rawRow && p.rawRow[h] !== undefined) val = p.rawRow[h];
        else if (p[h] !== undefined) val = p[h];
        else if (p.puntajes && p.puntajes[h] !== undefined) val = p.puntajes[h];
        else if (p.respuestas && p.respuestas[h] !== undefined) val = p.respuestas[h];
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const dateStr = new Date().toISOString().split('T')[0];
    this.downloadFile(csvContent, `dataset_campos_exportado_${dateStr}.csv`, 'text/csv;charset=utf-8;');
  }

  exportDatasetJSON() {
    const payload = this.getCustomDatasetPayload();
    if (!payload) return;
    const dateStr = new Date().toISOString().split('T')[0];
    this.downloadFile(JSON.stringify(payload, null, 2), `dataset_campos_exportado_${dateStr}.json`, 'application/json');
  }

  // ─── MÉTODOS DE IMPORTACIÓN Y EXPORTACIÓN DE LA BITÁCORA ──────────────────

  exportBitacoraCSV() {
    if (this.bitacoraLogs.length === 0) return;
    const headers = ['Fecha', 'Algoritmo', 'Modelo Base / Origen', 'Registros (Personas)', 'Dimensiones (Preguntas)', 'Parametros', 'Tiempo Respuesta (ms)'];
    const rows = this.bitacoraLogs.map(log => {
      const fechaStr = new Date(log.fecha).toLocaleString();
      const paramsStr = log.algoritmo === 'K-Means' || log.algoritmo === 'kmeans'
        ? `k=${log.parametros?.k || '-'};pca=${log.parametros?.pca ? 'Si' : 'No'}` 
        : `linkage=${log.parametros?.metodoEnlace || '-'}`;
      return [
        `"${fechaStr}"`,
        `"${log.algoritmo}"`,
        `"${log.modeloOrigen || 'Nuevo (desde cero)'}"`,
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
    const headers = ['Fecha', 'Algoritmo', 'Modelo Base / Origen', 'Registros (Personas)', 'Dimensiones (Preguntas)', 'Parametros', 'Tiempo Respuesta (ms)'];
    const fechaStr = new Date(log.fecha).toLocaleString();
    const paramsStr = log.algoritmo === 'K-Means' || log.algoritmo === 'kmeans'
      ? `k=${log.parametros?.k || '-'};pca=${log.parametros?.pca ? 'Si' : 'No'}` 
      : `linkage=${log.parametros?.metodoEnlace || '-'}`;
    const row = [
      `"${fechaStr}"`,
      `"${log.algoritmo}"`,
      `"${log.modeloOrigen || 'Nuevo (desde cero)'}"`,
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
