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

## 📌 Guía de Integración (Lizeth & Karen)

### 👩‍💻 Instrucciones para Lizeth

#### 1. Envío de Preguntas y Personas (Pasos 1 y 2) hacia los Algoritmos:
* **Paso 1 (Selección de Personas):** Almacenar los `_id` de las personas seleccionadas en un arreglo `ids: string[]`. Si la opción "Todas las personas" está activa, enviar `ids: []`.
* **Paso 2 (Selección de Preguntas/Aspectos):** Almacenar los `_id` de las preguntas seleccionadas en un arreglo `questions: string[]`. Si se seleccionan todas, enviar `questions: []`.
* **Ejecución de Algoritmos:**
  - **Para K-Means:** Enviar la petición al backend con el cuerpo:
    ```json
    {
      "ids": ["id_persona_1", "id_persona_2"],
      "questions": ["id_pregunta_1", "id_pregunta_2"],
      "k": 3,
      "incluirPCA": true
    }
    ```
  - **Para Clusterización Jerárquica:** Enviar la petición con el cuerpo:
    ```json
    {
      "ids": ["id_persona_1", "id_persona_2"],
      "questions": ["id_pregunta_1", "id_pregunta_2"],
      "linkage": "ward",
      "nClusters": 3,
      "incluirPCA": true
    }
    ```

#### 2. Registro y Control de Bitácoras (Logs de Actividad):
* Al ejecutar cualquiera de los dos algoritmos, registrar una entrada de bitácora con los siguientes campos:
  - `fecha`: Marca de tiempo (`new Date()`).
  - `algoritmo`: `'K-Means'` o `'Clusterización Jerárquica'`.
  - `personasEnviadas`: Arreglo de IDs o total enviado (`ids.length`).
  - `preguntasEnviadas`: Arreglo de preguntas o total enviado (`questions.length`).
  - `parametros`: Objeto con los parámetros usados (ej. `{ k: 3, linkage: 'ward', pca: true }`).
  - `duracionMs`: Tiempo de respuesta de la petición HTTP.
* Renderizar esta información en una tabla/panel de bitácoras para auditar el historial de ejecuciones.

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
