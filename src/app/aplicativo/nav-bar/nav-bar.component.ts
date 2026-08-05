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
  @Input() activePhase: string = 'fase1';
  @Input() enabledPhases: string[] = ['fase1', 'fase2', 'fase3', 'fase4', 'fase5'];
  @Output() phaseSelected = new EventEmitter<string>();

  navItems: NavItem[] = [
    { id: 'fase1', nombre: 'Fase 1: Selección de Personas' },
    { id: 'fase2', nombre: 'Fase 2: Selección de Campos' },
    { id: 'fase3', nombre: 'Fase 3: Selección de Algoritmo' },
    { id: 'fase4', nombre: 'Fase 4: Resultados' },
    { id: 'fase5', nombre: 'Fase 5: Bitácora' }
  ];

  isEnabled(phaseId: string): boolean {
    return this.enabledPhases.includes(phaseId);
  }

  selectPhase(phaseId: string) {
    this.activePhase = phaseId;
    this.phaseSelected.emit(phaseId);
  }
}
