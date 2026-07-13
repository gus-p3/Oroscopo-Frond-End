import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

// Material Imports
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { RouterModule } from '@angular/router';

import { ApiService, Pregunta, SignoZodiacal } from '../../services/api.service';

@Component({
  selector: 'app-cuestionario',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule,
    MatSelectModule, MatRadioModule, MatButtonModule,
    MatProgressBarModule, MatIconModule, MatRippleModule,
    RouterModule
  ],
  templateUrl: './cuestionario.component.html',
  styleUrls: ['./cuestionario.component.css']
})
export class CuestionarioComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);

  datosPersonalesForm!: FormGroup;
  // Un solo FormGroup con todos los controles de respuestas
  respuestasForm!: FormGroup;

  signos: SignoZodiacal[] = [];
  preguntas: Pregunta[] = [];

  pasoActual = 0;
  cargando = true;
  enviando = false;

  // TOTAL de pasos: 1 (datos) + N preguntas
  get totalPasos(): number { return 1 + this.preguntas.length; }
  get esUltimaPregunta(): boolean { return this.pasoActual === this.totalPasos - 1; }
  get preguntaActual(): Pregunta | null {
    if (this.pasoActual === 0 || this.preguntas.length === 0) return null;
    return this.preguntas[this.pasoActual - 1] ?? null;
  }

  get progreso(): number {
    if (this.totalPasos <= 1) return 0;
    return (this.pasoActual / (this.totalPasos - 1)) * 100;
  }

  // Verifica si la opcion dada está seleccionada en la pregunta actual
  estaSeleccionada(opcionId: string): boolean {
    const pregunta = this.preguntaActual;
    if (!pregunta) return false;
    return this.respuestasForm.get(pregunta._id)?.value === opcionId;
  }

  ngOnInit() {
    this.datosPersonalesForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      genero: ['', Validators.required],
      signoZodiacalId: ['', Validators.required]
    });

    this.respuestasForm = this.fb.group({});
    this.cargarDatos();
  }

  cargarDatos() {
    this.api.getCatalogos().subscribe(res => {
      this.signos = res.signos;
    });

    this.api.getCuestionario().subscribe(preguntas => {
      this.preguntas = preguntas;
      // Crear un control persistente por cada pregunta
      preguntas.forEach(p => {
        this.respuestasForm.addControl(p._id, this.fb.control('', Validators.required));
      });
      this.cargando = false;
    });
  }

  seleccionarOpcion(preguntaId: string, opcionId: string) {
    this.respuestasForm.get(preguntaId)?.setValue(opcionId);
    // Avanzar automáticamente después de seleccionar (ligero delay para ver la animación)
    setTimeout(() => this.siguientePaso(), 350);
  }

  siguientePaso() {
    if (this.pasoActual === 0 && this.datosPersonalesForm.valid) {
      this.pasoActual++;
    } else if (this.pasoActual > 0) {
      const pregunta = this.preguntaActual;
      if (pregunta && this.respuestasForm.get(pregunta._id)?.valid) {
        if (this.esUltimaPregunta) {
          this.finalizar();
        } else {
          this.pasoActual++;
        }
      }
    }
  }

  pasoAnterior() {
    if (this.pasoActual > 0) this.pasoActual--;
  }

  finalizar() {
    if (!this.datosPersonalesForm.valid || !this.respuestasForm.valid) return;

    this.enviando = true;
    const datos = this.datosPersonalesForm.value;
    const respuestasRaw = this.respuestasForm.value;

    const respuestasArray = Object.keys(respuestasRaw).map(preguntaId => ({
      preguntaId,
      opcionId: respuestasRaw[preguntaId]
    }));

    const payload = { ...datos, respuestas: respuestasArray };
    console.log(payload);

    this.api.submitEnvio(payload).subscribe({
      next: (resultado) => {
        this.enviando = false;
        this.router.navigate(['/resultados'], { state: { resultado, datos } });
      },
      error: (err) => {
        console.error(err);
        this.enviando = false;
        alert('Hubo un error al enviar el cuestionario. Revisa que el servidor esté corriendo.');
      }
    });
  }
}
