import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Interfaces based on the backend model
export interface Elemento {
  _id: string;
  nombre: string;
  naturaleza: string;
  elementoParId: string;
}

export interface SignoZodiacal {
  _id: string;
  nombre: string;
  elementoId: Elemento;
}

export interface OpcionRespuesta {
  _id: string;
  preguntaId: string;
  numero: number;
  texto: string;
  valor: number;
}

export interface Pregunta {
  _id: string;
  numero: number;
  texto: string;
  aspectoId: string;
  opciones: OpcionRespuesta[];
}

export interface EnvioInput {
  nombre: string;
  genero: string;
  signoZodiacalId: string;
  respuestas: { preguntaId: string; opcionId: string }[];
}

export interface EnvioResponse {
  vectorAspectos: any[];
  puntajesElemento: any[];
  elementoPredominanteId: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getCatalogos(): Observable<{ signos: SignoZodiacal[]; elementos: Elemento[] }> {
    return this.http.get<{ signos: SignoZodiacal[]; elementos: Elemento[] }>(`${this.apiUrl}/catalogos`);
  }

  getCuestionario(): Observable<Pregunta[]> {
    return this.http.get<Pregunta[]>(`${this.apiUrl}/cuestionario`);
  }

  submitEnvio(data: EnvioInput): Observable<EnvioResponse> {
    return this.http.post<EnvioResponse>(`${this.apiUrl}/envios`, data);
  }

  getEnvios(limit = 10, skip = 0, filtros = {}): Observable<any> {
    const params = { limit: limit.toString(), skip: skip.toString(), ...filtros };
    return this.http.get<any>(`${this.apiUrl}/envios`, { params });
  }

  getPersonas(limit = 50, skip = 0, filtros = {}): Observable<any> {
    const params = { limit: limit.toString(), skip: skip.toString(), ...filtros };
    return this.http.get<any>(`${this.apiUrl}/personas`, { params });
  }

  getEnvioById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/envios/${id}`);
  }

  getEstadisticas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/estadisticas`);
  }

  getBitacora(limit = 10, skip = 0): Observable<any> {
    const params = { limit: limit.toString(), skip: skip.toString() };
    return this.http.get<any>(`${this.apiUrl}/bitacora`, { params });
  }

  saveBitacora(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bitacora`, data);
  }

  exportDataset(payload: { ids: string[]; questions: string[]; format: string }): Observable<Blob | any> {
    if (payload.format === 'csv') {
      return this.http.post(`${this.apiUrl}/personas/export-dataset`, payload, { responseType: 'blob' });
    }
    return this.http.post<any>(`${this.apiUrl}/personas/export-dataset`, payload);
  }

  importarCSV(csvText: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/personas/importar`, csvText, {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}
