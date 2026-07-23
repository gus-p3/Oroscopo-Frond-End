import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AlgoritmItem {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  badge?: string;
}

@Component({
  selector: 'app-select-algoritm',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './select-algoritm.component.html',
  styleUrl: './select-algoritm.component.css',
})
export class SelectAlgoritmComponent {
  @Input() selectedId: string = 'kmeans';
  @Output() selectAlgorithm = new EventEmitter<AlgoritmItem>();

  algoritmItems: AlgoritmItem[] = [
    {
      id: 'kmeans',
      nombre: 'K-Means Clustering',
      descripcion: 'Agrupa los registros en K clusters basados en similitud de respuestas y distancia entre centroides.',
      icono: 'bi-diagram-3-fill',
      badge: 'Populares'
    },
    {
      id: 'jerarquico',
      nombre: 'Clusterización Jerárquica',
      descripcion: 'Crea una estructura en árbol (dendrograma) vinculando grupos según el método de enlace elegido.',
      icono: 'bi-tree-fill',
      badge: 'Jerárquico'
    }
  ];

  select(item: AlgoritmItem) {
    this.selectedId = item.id;
    this.selectAlgorithm.emit(item);
  }
}
