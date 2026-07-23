import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface KMeansParams {
  k: number;
  incluirPCA?: boolean;
  ids?: string[];
  questions?: string[];
}

export interface HierarchicalParams {
  metodoEnlace: 'ward' | 'average' | 'complete';
  nClusters?: number;
  incluirPCA?: boolean;
  ids?: string[];
  questions?: string[];
}

export interface PersonaCluster {
  _id?: string;
  id?: string;
  nombre: string;
  genero: string;
  signoZodiacal?: string;
  elementoSigno?: string;
  elementoEncuesta?: string;
  elementoPredominanteId?: string;
  cluster: number;
}

export interface KMeansResultResponse {
  message: string;
  personas?: PersonaCluster[];
  result: {
    k: number;
    labels: number[];
    centroids?: number[][];
    centroides?: number[][];
    inercia: number;
    pca_2d?: number[][];
    pca2d?: number[][];
    silhouette_score?: number;
  };
}

export interface HierarchicalResultResponse {
  message: string;
  result: {
    linkage_matrix?: number[][];
    labels?: number[];
    metodoEnlace?: string;
    dendrogram_data?: any;
  };
}

export interface ElbowPointResponse {
  k: number;
  inercia: number;
}

export interface ElbowResultResponse {
  message: string;
  result: {
    inercias: ElbowPointResponse[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class AlgorithmService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/algoritmo`;

  executeKMeans(params: KMeansParams): Observable<KMeansResultResponse> {
    return this.http.post<KMeansResultResponse>(`${this.apiUrl}/kmeans`, params);
  }

  executeHierarchical(params: HierarchicalParams): Observable<HierarchicalResultResponse> {
    return this.http.post<HierarchicalResultResponse>(`${this.apiUrl}/jerarquico`, params);
  }

  executeElbow(kMax: number = 10): Observable<ElbowResultResponse> {
    return this.http.post<ElbowResultResponse>(`${this.apiUrl}/elbow`, { kMax });
  }
}
