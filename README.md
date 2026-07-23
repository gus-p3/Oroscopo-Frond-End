# Oroscopo-Frond-End

Frontend de la aplicación de Cuestionario de Personalidad y Elementos del Zodiaco, desarrollado en Angular (standalone components, Angular Material, Reactive Forms).

## Configuración de Entornos

La URL de la API se configura en `src/environments/environment.ts` para desarrollo y en `src/environments/environment.prod.ts` para producción:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};
```

## Requisitos
- Node.js v18+
- Angular CLI

## Instalación
```bash
npm install
```

## Servidor de Desarrollo
Ejecuta `npm start` para levantar el servidor de desarrollo local en `http://localhost:4200/`.

## Login del Administrador
Para acceder al Panel de Administración en `http://localhost:4200/admin`:
- **Usuario:** `admin@orosco.com`
- **Contraseña:** `1234567A`

---

## 📌 Guía de Arquitectura e Integración (Lizeth & Karen)

### 👩‍💻 Instrucciones para Lizeth

#### 1. ¿Cómo pasar la selección de los Pasos 1 y 2 al Componente del Algoritmo?

Actualmente, el componente de cada Algoritmo (ej. `KMeansComponent`) es el encargado de llamar a `AlgorithmService`. Para que reciba las selecciones de personas (Paso 1) y preguntas (Paso 2), se deben usar cualquiera de las siguientes 2 opciones estándar en Angular:

##### **Opción A (Recomendada): Pasar selecciones mediante `@Input()`**
En el componente del algoritmo (ej. `k-means.component.ts`), declarar `@Input()` para las selecciones:
```typescript
@Input() selectedPersonaIds: string[] = [];
@Input() selectedQuestionIds: string[] = [];
```

Y en el template del componente contenedor o asistente (ej. `select-algoritm.component.html`):
```html
<app-k-means 
  [selectedPersonaIds]="personaIdsSeleccionadas" 
  [selectedQuestionIds]="preguntaIdsSeleccionadas"
  [data]="resultadoKMeans"
></app-k-means>
```

Al presionar "Ejecutar Algoritmo", se envía el payload completo al servicio:
```typescript
const payload = {
  k: this.kValue,
  incluirPCA: true,
  ids: this.selectedPersonaIds,         // 👈 Arreglo de IDs de Paso 1
  questions: this.selectedQuestionIds   // 👈 Arreglo de IDs de Paso 2
};

this.algorithmService.executeKMeans(payload).subscribe({
  next: (res) => this.resultado = res,
  error: (err) => console.error(err)
});
```

##### **Opción B: Guardar selecciones en un Servicio de Estado Compartido**
Si las pantallas cambian de ruta en el asistente, se puede inyectar un servicio singleton `SelectionService`:

```typescript
@Injectable({ providedIn: 'root' })
export class SelectionService {
  selectedPersonas: string[] = [];
  selectedQuestions: string[] = [];
}
```
- **Paso 1:** `this.selectionService.selectedPersonas = ['id1', 'id2'];`
- **Paso 2:** `this.selectionService.selectedQuestions = ['q1', 'q2'];`
- **Paso 3 (Algoritmo):** `this.algorithmService.executeKMeans({ ids: this.selectionService.selectedPersonas, questions: this.selectionService.selectedQuestions, k: 3 })`.

---

#### 2. Registro y Control de Bitácoras (Logs de Actividad):
* Al recibir la respuesta del algoritmo, registrar el evento de bitácora:
  ```typescript
  const logBitacora = {
    fecha: new Date(),
    algoritmo: 'K-Means',
    totalPersonas: payload.ids.length || 'Todas',
    totalPreguntas: payload.questions.length || 'Todas',
    parametros: { k: payload.k, pca: true },
    tiempoRespuestaMs: Date.now() - inicioMs
  };
  // Guardar logBitacora en la lista de bitácoras del estado
  ```

---

### 👩‍💻 Instrucciones para Karen

#### Replicar las funcionalidades desarrolladas en K-Means dentro del Componente de Clusterización Jerárquica:
1. **Gráficas de Puntos PCA (Scatter Plots 1 a 4):**
   * Copiar las vistas SVG y getters de `PcaPoint` para renderizar:
     - **Puntos 1:** Proyección PCA 2D principal (PC1 vs PC2).
     - **Puntos 2:** Dispersión por Distancia al Centroide/Grupo.
     - **Puntos 3:** Matriz 4x4 de Elemento Real vs Elemento Calculado.
     - **Puntos 4:** Rotación Ortogonal a 90° (PC2 vs -PC1).
2. **Gráficas Estadísticas y Composición (Sección 2):**
   * Incluir la tarjeta analítica **👑 Elemento Mayoritario por Cluster (Real vs Calculado)** con su indicador de coincidencia (`✅ Coinciden Mayorías` / `🔀 Difieren Mayorías`).
   * Incluir desgloses de volumen, elementos y afinidad de género por grupo.
3. **Tabla Liquid Glass con Paginación y Filtros (Sección 3):**
   * Implementar la **Barra de Filtros Multicriterio** (Buscador por Nombre, Filtro por Género, Filtro por Elemento Real, Filtro por Elemento Calculado y Filtro por Coincidencia).
   * Incluir el selector de **Registros por Página** (10, 15, 20, 50) y paginador.
4. **Panel Lateral Deslizante (`PersonaDetailComponent`):**
   * Hacer que al tocar cualquier fila de usuario en la tabla de Jerárquico se abra el **Offcanvas Side Drawer** (`<app-persona-detail [idPersona]="selectedPersonaId" (close)="closePersonaDetail()"></app-persona-detail>`) para consultar en tiempo real los 12 aspectos de personalidad del participante.
