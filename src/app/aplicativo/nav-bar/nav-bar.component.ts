import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface NavItem {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.css',
})
export class NavBarComponent {
  @Input() activePhase: string = 'fase3';
  @Output() phaseSelected = new EventEmitter<string>();

  navItems: NavItem[] = [
    { id: 'fase1', nombre: 'Fase 1: Selección de Personas' },
    { id: 'fase2', nombre: 'Fase 2: Selección de Preguntas' },
    { id: 'fase3', nombre: 'Fase 3: Selección de Algoritmo' },
    { id: 'fase4', nombre: 'Fase 4: Resultados' }
  ];

  selectPhase(phaseId: string) {
    this.activePhase = phaseId;
    this.phaseSelected.emit(phaseId);
  }
}
