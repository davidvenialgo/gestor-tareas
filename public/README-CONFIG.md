# Configuración de URLs de la API

## Archivo de Configuración

El archivo `config.js` contiene todas las URLs de la API que utiliza la aplicación. Para cambiar entre diferentes entornos (desarrollo, producción, etc.), solo necesitas modificar este archivo.

## Variables de Configuración

### API_BASE_URL
URL base de la API. Esta es la variable principal que controla todas las demás URLs.

**Desarrollo local:**
```javascript
const API_BASE_URL = 'http://127.0.0.1:8000/api';
```

**Producción:**
```javascript
const API_BASE_URL = 'https://gestor-tareas-dv.mnz.dom.my.id/api';
```

### URLs Específicas
Todas las URLs específicas se construyen automáticamente a partir de `API_BASE_URL`:

- `API_URL`: `${API_BASE_URL}/tareas` - Endpoint de tareas
- `LOGIN_URL`: `${API_BASE_URL}/login` - Endpoint de autenticación
- `USUARIOS_URL`: `${API_BASE_URL}/usuarios` - Endpoint de usuarios
- `USUARIO_URL`: `${API_BASE_URL}/usuario` - Endpoint de usuario individual
- `REGISTER_URL`: `${API_BASE_URL}/register` - Endpoint de registro
- `TAREAS_TODAS_URL`: `${API_BASE_URL}/tareas-todas` - Endpoint de todas las tareas
- `STORAGE_URL`: URL base para archivos (se construye removiendo `/api` de `API_BASE_URL`)

## Cómo Cambiar la Configuración

1. **Abrir el archivo `config.js`**
2. **Cambiar la línea de `API_BASE_URL`**:
   ```javascript
   // Para desarrollo local
   const API_BASE_URL = 'http://127.0.0.1:8000/api';
   
   // Para producción
   const API_BASE_URL = 'https://tu-servidor.com/api';
   ```
3. **Guardar el archivo**
4. **Recargar la página** en el navegador

## Ventajas de esta Configuración

- ✅ **Centralizada**: Todas las URLs están en un solo lugar
- ✅ **Fácil de cambiar**: Solo necesitas modificar una variable
- ✅ **Consistente**: Todas las peticiones usan la misma base
- ✅ **Mantenible**: No hay URLs hardcodeadas en el código principal

## Ejemplos de Uso

### Cambiar a un servidor de staging:
```javascript
const API_BASE_URL = 'https://staging.tu-app.com/api';
```

### Cambiar a un servidor local en puerto diferente:
```javascript
const API_BASE_URL = 'http://localhost:3000/api';
```

### Cambiar a un servidor con subdirectorio:
```javascript
const API_BASE_URL = 'https://tu-dominio.com/app/api';
```

## Notas Importantes

- Asegúrate de que el servidor de destino tenga CORS configurado correctamente
- Verifica que todos los endpoints estén disponibles en el nuevo servidor
- La URL de storage se construye automáticamente, no necesitas configurarla por separado

