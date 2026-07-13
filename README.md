# Oroscopo-Frond-End

Frontend de la aplicación de Cuestionario de Personalidad y Elementos del Zodiaco, desarrollado en Angular 21 (standalone components, Angular Material, Reactive Forms).

## Configuración de Entornos

La URL de la API se configura en `src/environments/environment.ts` para desarrollo y en `src/environments/environment.prod.ts` para producción.

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
