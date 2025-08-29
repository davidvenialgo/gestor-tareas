//const API_URL = 'http://127.0.0.1:8000/api/tareas';
//const LOGIN_URL = 'http://127.0.0.1:8000/api/login';

const API_URL = 'https://gestor-tareas-dv.mnz.dom.my.id/api/tareas';
const LOGIN_URL = 'https://gestor-tareas-dv.mnz.dom.my.id/api/login';

const formLogin = document.getElementById('form-login');
const loginSection = document.getElementById('login-section');
const tareasSection = document.getElementById('tareas-section');

let token = localStorage.getItem('token');

let paginaActual = 1;

let grafico = null;

let editandoId = null;
let filtroActivos = 'todas';
let timeoutBusqueda = null;
let tareaAEliminar = null; // Variable para almacenar el ID de la tarea a eliminar

// Variables para control de inactividad
let tiempoInactividad = 30 * 60 * 1000; // 30 minutos en milisegundos
let temporizadorInactividad = null;

const lista = document.getElementById('lista-tareas');
const form = document.getElementById('form-tarea');
const titulo = document.getElementById('titulo');
const descripcion = document.getElementById('descripcion');

async function cargarTareas(){ 
    console.log('Iniciando carga de tareas...');
    console.log('Token:', token);
    console.log('Página actual:', paginaActual);
    console.log('Filtro activo:', filtroActivos);
    
    lista.innerHTML = '';
    
    // Construir URL con parámetros
    const params = new URLSearchParams();
    params.append('page', paginaActual);
    
    // Agregar filtro si está activo
    if (filtroActivos !== 'todas') {
        params.append('filtro', filtroActivos);
    }
    
    // Agregar búsqueda si hay texto
    const textoBusqueda = document.getElementById('buscador').value.trim();
    if (textoBusqueda) {
        params.append('buscar', textoBusqueda);
    }
    
    const url = `${API_URL}?${params.toString()}`;
    console.log('Cargando tareas con URL:', url);

    try {
        const res = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        console.log('Respuesta del servidor:', res.status, res.statusText);

        if (await manejarErrorAutenticacion(res)) return;
        
        const data = await res.json();
        console.log('Datos recibidos:', data);
        
        if (!data.data) {
            console.error('No se encontró la propiedad data en la respuesta');
            return;
        }
        
        document.getElementById('paginacion').innerHTML = `
            <div class="paginacion-container">
                <button class="paginacion-btn" onclick = "cambiarPagina(${data.current_page - 1})" ${data.current_page === 1 ? 'disabled' : ''}>⬅ Anterior</button>
                <span class="paginacion-info">Pagina ${data.current_page} de ${data.last_page}</span>
                <button class="paginacion-btn" onclick = "cambiarPagina(${data.current_page + 1})" ${data.current_page === data.last_page ? 'disabled' : ''}>Siguiente</button>
            </div>
        `;

        notificarTareasProximas(data.data);

        // Usar los conteos totales del servidor
        const total = data.total_tareas || data.data.length;
        const completadas = data.total_completadas || data.data.filter(t => t.completada).length;
        const pendientes = data.total_pendientes || (total - completadas);

        console.log('Datos recibidos del servidor:', data);
        console.log('Conteos - Total:', total, 'Completadas:', completadas, 'Pendientes:', pendientes);

        document.getElementById('contador-tareas').innerHTML = `Total : ${total} | Pendientes : ${pendientes} | Completadas : ${completadas}`;

        let tareasFiltradas = data.data;

        const criterioOrden = document.getElementById('ordenar-por')?.value || 'creacion';

        if (criterioOrden === 'prioridad'){
            const prioridadValor = {alta: 3, media: 2, baja: 1};
            tareasFiltradas.sort((a, b) => (prioridadValor[b.prioridad] || 0) - (prioridadValor[a.prioridad] || 0));
        } else if (criterioOrden === 'fecha-limite'){
            tareasFiltradas.sort((a, b) => {
                const fechaA = a.fecha_limite ? new Date(a.fecha_limite) : Infinity;
                const fechaB = b.fecha_limite ? new Date(b.fecha_limite) : Infinity;
                return fechaA - fechaB;
            });
        } else {
            tareasFiltradas.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        // Siempre poner las tareas completadas al final
        tareasFiltradas.sort((a, b) => {
            if (a.completada && !b.completada) return 1;  // a va al final
            if (!a.completada && b.completada) return -1; // b va al final
            return 0; // mantener el orden actual
        });

        console.log('Tareas filtradas:', tareasFiltradas);

        tareasFiltradas.forEach(tarea => {
        const li = document.createElement('li');
            
            // Aplicar estilos visuales para tareas completadas
        if (tarea.completada) {
            li.style.textDecoration = 'line-through';
            li.style.opacity = '0.6';
            li.style.backgroundColor = '#f0f0f0';
        }
        
        // Determinar si es tarea propia o compartida
        const esTareaPropia = tarea.es_propia !== false; // Por defecto es propia si no está marcada
        
        // Verificar si la tarea está vencida
        const tareaVencida = !tarea.completada && tarea.fecha_limite && new Date(tarea.fecha_limite) < new Date();
        
        // Generar botones según el tipo de tarea - RESPONSIVE
        const botonesTarea = esTareaPropia 
            ? `<div class="botones-tarea-responsive">
                   <a href="#" onclick="editarTarea(${tarea.id}, '${tarea.titulo.replace(/'/g, "\\'")}', '${tarea.descripcion.replace(/'/g, "\\'")}')" class="btn-tarea-responsive">Editar</a>
                   <a href="#" onclick="compartirTareaDirecto(${tarea.id})" class="btn-tarea-responsive">Compartir</a>
                   <a href="#" onclick="eliminarTarea(${tarea.id}, event, true); return false;" class="btn-tarea-responsive">Eliminar</a>
               </div>`
            : `<div class="botones-tarea-responsive">
                   <a href="#" onclick="eliminarTarea(${tarea.id}, event, false); return false;" class="btn-tarea-responsive">Remover de mi bandeja</a>
               </div>`;
        
        li.innerHTML = `
            <div style="display: flex; align-items: center; width: 100%; position: relative; min-height: 60px;">
                <div style="flex: 1; text-align: left;">
                    <strong style="color: ${getColor(tarea.prioridad)}; font-size:1em;">${tarea.titulo}</strong>
                    ${!esTareaPropia ? '<small style="color: #007bff; margin-left: 8px; font-size: 0.95em;">(Compartida)</small>' : ''}
                </div>
                <div style="flex: 2; text-align: center; margin: 0 10px;">
                    <span style="color:#222; font-size:0.98em;">${tarea.descripcion}</span> <br>
                    <small style="color: #666; font-size:0.93em;">Creado el ${new Date(tarea.created_at).toLocaleDateString()}</small>
                </div>
                <div style="display: flex; align-items: center; gap: 7px;">
                    <input type="checkbox" onchange="toggleCompletado(${tarea.id}, this.checked)" ${tarea.completada ? 'checked' : ''}>
                    ${botonesTarea}
                    <small style="color: inherit; font-weight: normal; font-size:0.97em;">Fecha limite: ${tarea.fecha_limite ?? 'Sin fecha limite'}</small>
                </div>
            </div>
        `;
        
        if (tareaVencida) {
            // Solo agregar la etiqueta flotante, sin cambiar el diseño
            const etiquetaVencida = document.createElement('div');
            etiquetaVencida.innerHTML = '<i class="bi bi-exclamation-triangle-fill" style="margin-right:3px;font-size:13px;"></i>VENCIDA';
            etiquetaVencida.style.position = 'absolute';
            etiquetaVencida.style.top = '8px';
            etiquetaVencida.style.right = '12px';
            etiquetaVencida.style.background = '#dc3545';
            etiquetaVencida.style.color = '#fff';
            etiquetaVencida.style.padding = '1px 8px';
            etiquetaVencida.style.borderRadius = '12px';
            etiquetaVencida.style.fontSize = '11px';
            etiquetaVencida.style.fontWeight = 'bold';
            etiquetaVencida.style.boxShadow = '0 1px 4px rgba(220,53,69,0.10)';
            etiquetaVencida.style.letterSpacing = '0.5px';
            etiquetaVencida.style.opacity = '0.93';
            etiquetaVencida.style.animation = 'pulse 2s infinite';
            li.querySelector('div').appendChild(etiquetaVencida);
        }

        if (tarea.archivo) {
            const extension = tarea.archivo.split('.').pop().toLowerCase();
            const esImagen = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension);
            
            if (esImagen) {
                li.innerHTML += `<br><img src="http://127.0.0.1:8000/storage/${tarea.archivo}" alt="Imagen adjunta" style="width: 150px; height: auto; border-radius: 8px; margin-top: 10px;">`;
            } else {
                li.innerHTML += `<br><a href="http://127.0.0.1:8000/storage/${tarea.archivo}" target="_blank" style="color: #007bff; text-decoration: none;">📎 Ver archivo</a>`;
            }
        }

        lista.appendChild(li);
        });

        // Actualizar el gráfico una sola vez después de procesar todas las tareas
        actualizarGrafico(completadas, pendientes);
        
        console.log('Carga de tareas completada');
    } catch (error) {
        console.error('Error al cargar tareas:', error);
        alert('Error al cargar las tareas: ' + error.message);
    }
}

form.onsubmit = async (e) => {
    e.preventDefault();

    if(titulo.value.trim() === ''){
        alert('Por favor, escribe un titulo para la tarea');
        titulo.focus();
        return;
    }

    const datos = {
        titulo: titulo.value.trim(),
        descripcion: descripcion.value.trim(),
        prioridad: document.getElementById('prioridad').value,
        fecha_limite: document.getElementById('fecha-limite').value || null,
    }

    const formData = new FormData();

    formData.append('titulo', titulo.value.trim());
    formData.append('descripcion', descripcion.value.trim());
    formData.append('prioridad', document.getElementById('prioridad').value);
    formData.append('fecha_limite', document.getElementById('fecha-limite').value || null);
    
    const archivoInput = document.getElementById('archivo');
    if (archivoInput.files.length > 0) {
        formData.append('archivo', archivoInput.files[0]);
    }

    const fueEdicion = !!editandoId;
    const url = editandoId ? `${API_URL}/${editandoId}` : API_URL;

    const res = await fetch(url, {
        method: editandoId ? 'PUT' : 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData,
    });

    if (manejarErrorAutenticacion(res)) return;
    
    if (editandoId) {
        editandoId = null;
    }
    
    mostrarMensajeExito(fueEdicion ? 'Tarea actualizada correctamente' : 'Tarea creada correctamente');

    titulo.value = '';
    descripcion.value = '';
    document.getElementById('prioridad').value = 'media';
    document.getElementById('fecha-limite').value = '';
    document.getElementById('archivo').value = '';
    cargarTareas();
};

async function eliminarTarea (id, event, esPropia = null){
    if(event) event.preventDefault();
    
    console.log('Función eliminarTarea llamada con id:', id, 'esPropia:', esPropia);
    console.log('Token disponible:', token ? 'Sí' : 'No');
    console.log('API_URL:', API_URL);
    
    // Si no se proporciona esPropia, intentar determinarlo del DOM
    if (esPropia === null) {
        const tareaElement = document.querySelector(`li a[onclick*="eliminarTarea(${id}"]`);
        const tareaLi = tareaElement ? tareaElement.closest('li') : null;
        esPropia = tareaLi && tareaLi.querySelector('a[onclick*="compartirTareaDirecto"]');
        console.log('esPropia determinado del DOM:', esPropia);
    }
    
    const tituloAccion = esPropia ? 'Eliminar Tarea' : 'Remover de mi Bandeja';
    const mensajeAccion = esPropia 
        ? '¿Estás seguro de que quieres eliminar esta tarea? Esta acción no se puede deshacer.'
        : '¿Estás seguro de que quieres remover esta tarea de tu bandeja? La tarea seguirá existiendo para el usuario que la compartió.';
    const textoBoton = esPropia ? 'Eliminar' : 'Remover';
    
    console.log('Creando modal con:', { tituloAccion, textoBoton, esPropia });
    
    // Crear modal dinámicamente
    const modalHTML = `
        <div id="modal-eliminar-dinamico" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 999999;
        ">
            <div style="
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                max-width: 400px;
                width: 90%;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            ">
                <h3 style="margin-bottom: 15px; color: #333;">${tituloAccion}</h3>
                <p style="margin-bottom: 20px; color: #666;">${mensajeAccion}</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="confirmarEliminarDinamico(${id})" style="
                        padding: 10px 20px;
                        background-color: #dc3545;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 16px;
                    ">${textoBoton}</button>
                    <button onclick="cerrarModalEliminarDinamico()" style="
                        padding: 10px 20px;
                        background-color: #6c757d;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 16px;
                    ">Cancelar</button>
                </div>
            </div>
        </div>
    `;
    
    // Agregar el modal al body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    console.log('Modal de eliminar dinámico creado y mostrado');
    console.log('Modal en DOM:', document.getElementById('modal-eliminar-dinamico') ? 'Sí' : 'No');
}

async function confirmarEliminarDinamico(tareaId){
    console.log('=== INICIO confirmarEliminarDinamico ===');
    console.log('Confirmando eliminación de tarea:', tareaId);
    console.log('Token disponible:', token ? 'Sí' : 'No');
    console.log('API_URL:', API_URL);
    console.log('URL completa:', `${API_URL}/${tareaId}`);
    
    try {
        console.log('Enviando petición DELETE...');
        const res = await fetch(`${API_URL}/${tareaId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        console.log('Respuesta del servidor recibida:', res.status, res.statusText);
        console.log('Headers de respuesta:', Object.fromEntries(res.headers.entries()));

        if (await manejarErrorAutenticacion(res)) {
            console.log('Error de autenticación manejado');
            return;
        }

        if (res.ok) {
            console.log('Respuesta exitosa, procesando...');
            try {
                const responseData = await res.json();
                console.log('Datos de respuesta:', responseData);
                const mensaje = responseData.message || 'Tarea eliminada correctamente';
                mostrarMensajeExito('🗑️ ' + mensaje);
            } catch (error) {
                console.log('No hay JSON en la respuesta, usando mensaje por defecto');
                mostrarMensajeExito('🗑️ Tarea eliminada correctamente');
            }
            console.log('Cerrando modal y recargando tareas...');
            cerrarModalEliminarDinamico();
            cargarTareas();
        } else {
            console.log('Respuesta no exitosa, procesando error...');
            try {
                const errorData = await res.json();
                console.error('Error al eliminar tarea:', errorData);
                alert('Error al eliminar la tarea: ' + (errorData.message || 'Error desconocido'));
            } catch (error) {
                console.error('Error al parsear respuesta de error:', error);
                alert('Error al eliminar la tarea: Error del servidor');
            }
        }
    } catch (error) {
        console.error('Error de red al eliminar tarea:', error);
        alert('Error al eliminar la tarea: ' + error.message);
    }
    
    console.log('=== FIN confirmarEliminarDinamico ===');
}

function cerrarModalEliminarDinamico() {
    const modal = document.getElementById('modal-eliminar-dinamico');
    if (modal) {
        modal.remove();
    }
}

// Funciones originales para compatibilidad (ya no se usan)
async function confirmarEliminar(){
    if (!tareaAEliminar) return;
    
    const res = await fetch(`${API_URL}/${tareaAEliminar}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    
    if (await manejarErrorAutenticacion(res)) return;
    
    // Ocultar el modal
    document.getElementById('modal-eliminar').style.display = 'none';
    tareaAEliminar = null;
    
    cargarTareas();
}

function cancelarEliminar(){
    // Ocultar el modal
    document.getElementById('modal-eliminar').style.display = 'none';
    tareaAEliminar = null;
}

function editarTarea (id, t, d){
    titulo.value = t;
    descripcion.value = d;
    editandoId = id;

    // Mostrar el formulario de edición
    form.style.display = 'block';
    
    // Ocultar la sección de compartir si existe
    const compartirSection = document.getElementById('compartir-section');
    if (compartirSection) {
        compartirSection.style.display = 'none';
    }
}

async function toggleCompletado(id, estado){
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ completada: estado }),
    });

    if (await manejarErrorAutenticacion(res)) return;
    
    // Recargar tareas ordenando las completadas al final
    await cargarTareas();

    if (estado){
        mostrarMensajeExito('✅ Tarea completada correctamente');
    } else {
        mostrarMensajeExito('↩️ Tarea marcada como pendiente');
    }
}

function filtrar(filtro){
    filtroActivos = filtro;
    paginaActual = 1; // Resetear a la primera página cuando cambias el filtro
    cargarTareas();
}

function buscarTareas() {
    // Limpiar el timeout anterior
    if (timeoutBusqueda) {
        clearTimeout(timeoutBusqueda);
    }
    
    // Establecer un nuevo timeout
    timeoutBusqueda = setTimeout(() => {
        paginaActual = 1; // Resetear a la primera página cuando buscas
        cargarTareas();
    }, 300); // Esperar 300ms antes de ejecutar
}

formLogin.onsubmit = async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    });

    if (response.ok){
        const data = await response.json();
        token = data.token;
        localStorage.setItem('token', token);
        localStorage.setItem('username', JSON.stringify(data.user.name));
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Asegurar que los datos del usuario incluyan el campo can_view_users
        if (data.user.can_view_users === undefined) {
            data.user.can_view_users = false;
            localStorage.setItem('user', JSON.stringify(data.user));
        }

        document.getElementById('bienvenida').innerHTML = `👤 Bienvenido, ${data.user.name}`;
        loginSection.style.display = 'none';
        tareasSection.style.display = 'block';
        
        // Mostrar el botón del menú después del login exitoso
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.style.display = 'block';
        }
        
        // Mostrar opciones según permisos del usuario
        const menuVerUsuarios = document.getElementById('menu-ver-usuarios');
        const menuReportes = document.getElementById('menu-reportes');
        
        console.log('🔍 Debug - Usuario logueado:', data.user);
        console.log('🔍 Debug - ID del usuario:', data.user.id);
        console.log('🔍 Debug - Permisos can_view_users:', data.user.can_view_users);
        console.log('🔍 Debug - Permisos can_view_reports:', data.user.can_view_reports);
        
        if (menuVerUsuarios) {
            if (data.user.can_view_users) {
                menuVerUsuarios.style.display = 'block';
                console.log('✅ Opción "Ver Usuarios" habilitada por permisos');
            } else {
                menuVerUsuarios.style.display = 'none';
                console.log('❌ Opción "Ver Usuarios" oculta - sin permisos');
            }
        }
        
        if (menuReportes) {
            if (data.user.can_view_reports) {
                menuReportes.style.display = 'block';
                console.log('✅ Opción "Reportes" habilitada por permisos');
            } else {
                menuReportes.style.display = 'none';
                console.log('❌ Opción "Reportes" oculta - sin permisos');
            }
        }
        
        cargarTareas();
        iniciarMonitoreoInactividad(); // Iniciar monitoreo de inactividad
    } else {
        alert('Credenciales incorrectas');
    }
}

function logout(){
    console.log('=== INICIO FUNCIÓN LOGOUT ===');
    console.log('Función logout ejecutándose...');
    
    try {
        // Limpiar el temporizador de inactividad
        if (temporizadorInactividad) {
            clearTimeout(temporizadorInactividad);
            temporizadorInactividad = null;
            console.log('✓ Temporizador de inactividad limpiado');
        } else {
            console.log('⚠ No había temporizador de inactividad activo');
        }
        
        // Limpiar localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('user');
        token = null;
        console.log('✓ Token eliminado del localStorage');
        
        // Ocultar menú
        const menuOverlay = document.getElementById('menu-overlay');
        if (menuOverlay) {
            menuOverlay.classList.remove('show');
        }
        
        // Ocultar botón del menú
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.style.display = 'none';
        }
        
        // Ocultar opciones del menú
        const menuVerUsuarios = document.getElementById('menu-ver-usuarios');
        if (menuVerUsuarios) {
            menuVerUsuarios.style.display = 'none';
        }
        
        const menuReportes = document.getElementById('menu-reportes');
        if (menuReportes) {
            menuReportes.style.display = 'none';
        }
        
        console.log('✓ Menú ocultado');
        
        // Ocultar todas las secciones usando la función helper
        ocultarTodasLasSecciones();
        
        // Limpiar bienvenida
        const bienvenida = document.getElementById('bienvenida');
        if (bienvenida) {
            bienvenida.innerHTML = '';
            console.log('✓ Bienvenida limpiada');
        } else {
            console.log('❌ No se encontró bienvenida');
        }
        
        // Limpiar formulario de login
        const formLogin = document.getElementById('formLogin');
        if (formLogin) {
            formLogin.reset();
            console.log('✓ Formulario de login limpiado');
        }
        
        // Mostrar sección de login
        if (loginSection) {
            loginSection.style.display = 'block';
            console.log('✓ Sección de login mostrada');
        } else {
            console.log('❌ No se encontró loginSection');
        }
        
        console.log('=== LOGOUT COMPLETADO ===');
        
    } catch (error) {
        console.error('❌ Error en logout:', error);
    }
}

if (token){
    loginSection.style.display = 'none';
    tareasSection.style.display = 'block';
    const nombre = JSON.parse(localStorage.getItem('username')) || 'Usuario';
    document.getElementById('bienvenida').innerHTML = `👤 Hola, ${nombre}`;
    
    // Mostrar el botón del menú si hay una sesión activa
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.style.display = 'block';
    }
    
        // Mostrar opciones según permisos del usuario
    const userData = localStorage.getItem('user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const menuVerUsuarios = document.getElementById('menu-ver-usuarios');
            const menuReportes = document.getElementById('menu-reportes');
            
            if (menuVerUsuarios) {
                if (user.can_view_users) {
                    menuVerUsuarios.style.display = 'block';
                    console.log('✅ Opción "Ver Usuarios" habilitada por permisos');
                } else {
                    menuVerUsuarios.style.display = 'none';
                    console.log('❌ Opción "Ver Usuarios" oculta - sin permisos');
                }
            }
            
            if (menuReportes) {
                if (user.can_view_reports) {
                    menuReportes.style.display = 'block';
                    console.log('✅ Opción "Reportes" habilitada por permisos');
                } else {
                    menuReportes.style.display = 'none';
                    console.log('❌ Opción "Reportes" oculta - sin permisos');
                }
            }
            
            // Debug: mostrar información del usuario
            console.log('🔍 Usuario actual:', user);
            console.log('🔍 can_view_users:', user.can_view_users);
        } catch (e) {
            console.error('Error al parsear datos del usuario:', e);
        }
    }

// Variables globales para reportes
let todasLasTareas = [];
let tareasFiltradas = [];
let paginaActualReportes = 1;
const tareasPorPaginaReportes = 10;

// Funciones para la sección de reportes
function cargarDatosReportes() {
    console.log('🔄 Cargando datos para reportes...');
    
    // Cargar lista de usuarios para el filtro
    cargarUsuariosParaReportes();
    
    // Cargar todas las tareas
    cargarTodasLasTareas();
}

async function cargarUsuariosParaReportes() {
    try {
        console.log('🔄 Cargando usuarios para filtro de reportes...');
        const response = await fetch('http://127.0.0.1:8000/api/usuarios', {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        console.log('📡 Respuesta del servidor:', response.status, response.statusText);

        if (response.ok) {
            const usuarios = await response.json();
            console.log('👥 Usuarios recibidos:', usuarios.length);
            
            const selectUsuario = document.getElementById('reporte-usuario');
            
            // Limpiar opciones existentes excepto la primera
            selectUsuario.innerHTML = '<option value="">Todos los usuarios</option>';
            
            // Agregar usuarios
            usuarios.forEach(usuario => {
                const option = document.createElement('option');
                option.value = usuario.id;
                option.textContent = usuario.name;
                selectUsuario.appendChild(option);
            });
            
            console.log('✅ Usuarios cargados para filtros de reporte:', usuarios.length);
        } else {
            const errorData = await response.text();
            console.error('❌ Error al cargar usuarios para reportes:', response.status, errorData);
            
            // Mostrar mensaje de error en el select
            const selectUsuario = document.getElementById('reporte-usuario');
            selectUsuario.innerHTML = '<option value="">Error al cargar usuarios</option>';
        }
    } catch (error) {
        console.error('❌ Error de red al cargar usuarios:', error);
        
        // Mostrar mensaje de error en el select
        const selectUsuario = document.getElementById('reporte-usuario');
        selectUsuario.innerHTML = '<option value="">Error de conexión</option>';
    }
}

async function cargarTodasLasTareas() {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/tareas-todas', {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            todasLasTareas = await response.json();
            console.log('✅ Todas las tareas cargadas:', todasLasTareas.length);
            
            // Aplicar filtros iniciales
            generarReporte();
        } else {
            console.error('❌ Error al cargar tareas para reportes');
        }
    } catch (error) {
        console.error('❌ Error de red al cargar tareas:', error);
    }
}

function generarReporte() {
    console.log('🔄 Generando reporte...');
    
    const usuarioFiltro = document.getElementById('reporte-usuario').value;
    const estadoFiltro = document.getElementById('reporte-estado').value;
    const prioridadFiltro = document.getElementById('reporte-prioridad').value;
    const fechaFiltro = document.getElementById('reporte-fecha').value;
    
    // Aplicar filtros
    tareasFiltradas = todasLasTareas.filter(tarea => {
        let cumpleFiltros = true;
        
        // Filtro por usuario
        if (usuarioFiltro && tarea.user_id != usuarioFiltro) {
            cumpleFiltros = false;
        }
        
        // Filtro por estado
        if (estadoFiltro && tarea.completada !== (estadoFiltro === 'completada')) {
            cumpleFiltros = false;
        }
        
        // Filtro por prioridad
        if (prioridadFiltro && tarea.prioridad !== prioridadFiltro) {
            cumpleFiltros = false;
        }
        
        // Filtro por fecha
        if (fechaFiltro) {
            const fechaTarea = new Date(tarea.created_at).toISOString().split('T')[0];
            if (fechaTarea !== fechaFiltro) {
                cumpleFiltros = false;
            }
        }
        
        return cumpleFiltros;
    });
    
    console.log('📊 Tareas filtradas:', tareasFiltradas.length);
    
    // Actualizar estadísticas
    actualizarEstadisticasReporte();
    
    // Mostrar tareas
    mostrarTareasReporte();
}

function actualizarEstadisticasReporte() {
    const total = tareasFiltradas.length;
    const completadas = tareasFiltradas.filter(t => t.completada).length;
    const pendientes = tareasFiltradas.filter(t => !t.completada).length;
    
    // Calcular tareas vencidas
    const hoy = new Date();
    const vencidas = tareasFiltradas.filter(t => {
        if (t.completada || !t.fecha_limite) return false;
        return new Date(t.fecha_limite) < hoy;
    }).length;
    
    document.getElementById('total-tareas-reporte').textContent = total;
    document.getElementById('tareas-completadas-reporte').textContent = completadas;
    document.getElementById('tareas-pendientes-reporte').textContent = pendientes;
    document.getElementById('tareas-vencidas-reporte').textContent = vencidas;
}

function mostrarTareasReporte() {
    const reportesList = document.getElementById('reportes-list');
    const inicio = (paginaActualReportes - 1) * tareasPorPaginaReportes;
    const fin = inicio + tareasPorPaginaReportes;
    const tareasPagina = tareasFiltradas.slice(inicio, fin);
    
    if (tareasPagina.length === 0) {
        reportesList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <i class="bi bi-inbox" style="font-size: 48px; margin-bottom: 20px; display: block;"></i>
                <h3>No se encontraron tareas</h3>
                <p>Intenta ajustar los filtros de búsqueda</p>
            </div>
        `;
        return;
    }
    
    const tareasHTML = tareasPagina.map(tarea => {
        const fechaCreacion = new Date(tarea.created_at).toLocaleDateString('es-ES');
        const fechaLimite = tarea.fecha_limite ? new Date(tarea.fecha_limite).toLocaleDateString('es-ES') : 'Sin fecha límite';
        const esVencida = tarea.fecha_limite && new Date(tarea.fecha_limite) < new Date() && !tarea.completada;
        
        return `
            <div class="tarea-reporte-item ${esVencida ? 'vencida' : ''}">
                <div class="tarea-reporte-header">
                    <h3 class="tarea-reporte-title">${tarea.titulo}</h3>
                    <span class="status-badge ${tarea.completada ? 'completada' : 'pendiente'}">
                        ${tarea.completada ? 'COMPLETADA' : 'PENDIENTE'}
                    </span>
                </div>
                
                <div class="tarea-reporte-meta">
                    <span><i class="bi bi-calendar"></i> Creada: ${fechaCreacion}</span>
                    <span><i class="bi bi-calendar-check"></i> Límite: ${fechaLimite}</span>
                    <span><i class="bi bi-flag"></i> Prioridad: ${tarea.prioridad || 'Sin prioridad'}</span>
                    ${esVencida ? '<span style="color: #dc3545;"><i class="bi bi-exclamation-triangle"></i> VENCIDA</span>' : ''}
                </div>
                
                <div class="tarea-reporte-description">
                    ${tarea.descripcion || 'Sin descripción'}
                </div>
                
                <div class="tarea-reporte-footer">
                    <div class="tarea-reporte-user">
                        <div class="user-avatar">
                            ${tarea.user_name ? tarea.user_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        ${tarea.user_name || 'Usuario desconocido'}
                    </div>
                    
                    <div class="tarea-reporte-actions">
                        <button class="btn-reporte btn-reporte-view" onclick="verTareaReporte(${tarea.id})">
                            <i class="bi bi-eye"></i> Ver
                        </button>
                        <button class="btn-reporte btn-reporte-edit" onclick="editarTareaReporte(${tarea.id})">
                            <i class="bi bi-pencil"></i> Editar
                        </button>
                        <button class="btn-reporte btn-reporte-delete" onclick="eliminarTareaReporte(${tarea.id})">
                            <i class="bi bi-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    reportesList.innerHTML = tareasHTML;
    
    // Actualizar paginación
    actualizarPaginacionReportes();
}

function actualizarPaginacionReportes() {
    const totalPaginas = Math.ceil(tareasFiltradas.length / tareasPorPaginaReportes);
    const paginacionContainer = document.getElementById('paginacion-reportes');
    
    if (totalPaginas <= 1) {
        paginacionContainer.innerHTML = '';
        return;
    }
    
    let paginacionHTML = '<div class="paginacion">';
    
    // Botón anterior
    if (paginaActualReportes > 1) {
        paginacionHTML += `<button onclick="cambiarPaginaReportes(${paginaActualReportes - 1})" class="btn-pagina">Anterior</button>`;
    }
    
    // Números de página
    for (let i = 1; i <= totalPaginas; i++) {
        if (i === paginaActualReportes) {
            paginacionHTML += `<button class="btn-pagina activo">${i}</button>`;
        } else {
            paginacionHTML += `<button onclick="cambiarPaginaReportes(${i})" class="btn-pagina">${i}</button>`;
        }
    }
    
    // Botón siguiente
    if (paginaActualReportes < totalPaginas) {
        paginacionHTML += `<button onclick="cambiarPaginaReportes(${paginaActualReportes + 1})" class="btn-pagina">Siguiente</button>`;
    }
    
    paginacionHTML += '</div>';
    paginacionContainer.innerHTML = paginacionHTML;
}

function cambiarPaginaReportes(nuevaPagina) {
    paginaActualReportes = nuevaPagina;
    mostrarTareasReporte();
}

function verTareaReporte(tareaId) {
    // Implementar vista detallada de la tarea
    alert(`Viendo tarea ID: ${tareaId}`);
}

function editarTareaReporte(tareaId) {
    // Implementar edición de tarea
    alert(`Editando tarea ID: ${tareaId}`);
}

function eliminarTareaReporte(tareaId) {
    // Implementar eliminación de tarea
    if (confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
        alert(`Eliminando tarea ID: ${tareaId}`);
    }
}
    
    cargarTareas();
    iniciarMonitoreoInactividad(); // Iniciar monitoreo de inactividad
}

async function manejarErrorAutenticacion(response){
    if (response.status === 401){
        alert('Sesión expirada. Por favor, inicia sesión nuevamente.');
        logout();
        return true;
    }
    
    if (response.status === 403){
        try {
            const data = await response.json();
            if (data.status === 'inactive') {
                alert('Tu cuenta está inactiva. Contacta al administrador.');
                logout();
                return true;
            }
        } catch (e) {
            // Si no se puede parsear la respuesta, mostrar mensaje genérico
            alert('Acceso denegado. Tu cuenta puede estar inactiva.');
            logout();
            return true;
        }
    }
    
    return false;
}

document.getElementById('form-perfil').onsubmit = async (e) => {
    e.preventDefault();

    const nuevoNombre = document.getElementById('perfil-nombre').value.trim();
    const nuevoUsername = document.getElementById('perfil-username').value.trim();
    const nuevoEmail = document.getElementById('perfil-email').value.trim();
    const nuevoPassword = document.getElementById('perfil-password').value;
    const confirmarPassword = document.getElementById('perfil-password-confirm').value;
    // Los permisos se eliminaron del formulario, mantener los valores actuales del usuario
    const canViewUsers = user.can_view_users || false;
    const canViewReports = user.can_view_reports || false;

    // Validaciones
    if (!nuevoNombre) {
        alert('Por favor, ingresa tu nombre completo');
        return;
    }

    if (nuevoPassword && nuevoPassword.length < 8) {
        alert('La contraseña debe tener al menos 8 caracteres');
        return;
    }

    if (nuevoPassword && nuevoPassword !== confirmarPassword) {
        alert('Las contraseñas no coinciden');
        return;
    }

    // Obtener ID del usuario logueado
    const userData = localStorage.getItem('user');
    if (!userData) {
        alert('Error: No se encontraron datos del usuario');
        return;
    }

    const user = JSON.parse(userData);
    const userId = user.id;

    const body = {
        name: nuevoNombre,
        user_id: userId
    };

    if (nuevoUsername) {
        body.username = nuevoUsername;
    }

    if (nuevoEmail) {
        body.email = nuevoEmail;
    }

    if (nuevoPassword) {
        body.password = nuevoPassword;
    }

    body.can_view_users = canViewUsers;
    body.can_view_reports = canViewReports;

    try {
        const res = await fetch('http://127.0.0.1:8000/api/usuario', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        if (await manejarErrorAutenticacion(res)) return;

        if (res.ok) {
            const data = await res.json();
            
            // Actualizar datos en localStorage
            user.name = nuevoNombre;
            if (nuevoUsername) user.username = nuevoUsername;
            if (nuevoEmail) user.email = nuevoEmail;
            user.can_view_users = canViewUsers;
            user.can_view_reports = canViewReports;
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('username', JSON.stringify(nuevoNombre));
            
            // Actualizar el mensaje de bienvenida
            document.getElementById('bienvenida').innerHTML = `👤 Bienvenido, ${nuevoNombre}`;
            
            // Recargar datos del perfil para mostrar la información actualizada
            cargarDatosPerfil();
            
            // Limpiar campos de contraseña
            document.getElementById('perfil-password').value = '';
            document.getElementById('perfil-password-confirm').value = '';
            
            mostrarMensajeExito('✅ Perfil actualizado correctamente');
        } else {
            const errorData = await res.text();
            console.error('Error del servidor:', res.status, errorData);
            alert(`Error al actualizar el perfil (${res.status}): ${errorData}`);
        }
    } catch (error) {
        console.error('Error de red:', error);
        alert(`Error de conexión: ${error.message}`);
    }
}

function editarPerfil(userId = null){
    console.log('Función editarPerfil ejecutada para usuario ID:', userId);
    
    // Si no se proporciona userId, usar el usuario logueado
    if (!userId) {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                userId = user.id;
            } catch (e) {
                console.error('Error al parsear datos del usuario:', e);
            }
        }
    }
    
    // Buscar el usuario en la lista de usuarios cargados
    let usuarioAEditar = null;
    if (todosLosUsuarios && todosLosUsuarios.length > 0) {
        usuarioAEditar = todosLosUsuarios.find(u => u.id == userId);
    }
    
    let userName = '';
    let userUsername = '';
    let userStatus = 'activo';
    let userCanViewUsers = false;
    let userCanViewReports = false;
    if (usuarioAEditar) {
        userName = usuarioAEditar.name || '';
        userUsername = usuarioAEditar.username || '';
        userStatus = usuarioAEditar.status || 'activo';
        userCanViewUsers = usuarioAEditar.can_view_users || false;
        userCanViewReports = usuarioAEditar.can_view_reports || false;
        console.log('Editando usuario:', usuarioAEditar);
    } else {
        console.log('Usuario no encontrado, usando datos del logueado');
        // Fallback a datos del usuario logueado
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                userName = user.name || '';
                userUsername = user.username || '';
                userStatus = user.status || 'activo';
                userCanViewUsers = user.can_view_users || false;
                userCanViewReports = user.can_view_reports || false;
            } catch (e) {
                console.error('Error al parsear datos del usuario:', e);
            }
        }
    }
    
    // Crear el modal completo para editar perfil
    const modalHTML = `
        <div id="modal-editar-perfil-real" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding: 20px;
            overflow-y: auto;
            z-index: 99999;
        ">
            <div style="
                background-color: white;
                padding: 30px;
                border-radius: 15px;
                max-width: 500px;
                width: 90%;
                max-height: calc(100vh - 40px);
                overflow-y: auto;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                margin: auto;
            ">
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 15px;
                ">
                    <h3 style="margin: 0; color: #333; font-size: 20px;">
                        <i class="bi bi-person-circle"></i> Editar Perfil
                    </h3>
                    <button onclick="cerrarModalEditarPerfilReal()" style="
                        background: none;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                        color: #666;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">&times;</button>
                </div>
                
                <form id="form-editar-perfil-real" onsubmit="editarPerfilDesdeModalReal(event)">
                    <input type="hidden" id="usuario-id-a-editar" value="${userId}">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">
                            Nombre completo *
                        </label>
                        <input type="text" id="perfil-nombre-real" value="${userName}" placeholder="Ingresa el nombre completo" required style="
                            width: 100%;
                            padding: 12px;
                            border: 1px solid #ddd;
                            border-radius: 8px;
                            font-size: 14px;
                            box-sizing: border-box;
                        ">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">
                            Nombre de usuario
                        </label>
                        <input type="text" id="perfil-username-real" value="${userUsername}" placeholder="Ingresa el nombre de usuario" style="
                            width: 100%;
                            padding: 12px;
                            border: 1px solid #ddd;
                            border-radius: 8px;
                            font-size: 14px;
                            box-sizing: border-box;
                        ">
                        <small style="color: #666; font-size: 12px;">Deja vacío para mantener el actual</small>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">
                            Estado del usuario
                        </label>
                        <select id="perfil-status-real" style="
                            width: 100%;
                            padding: 12px;
                            border: 1px solid #ddd;
                            border-radius: 8px;
                            font-size: 14px;
                            box-sizing: border-box;
                        ">
                            <option value="activo" ${userStatus === 'activo' ? 'selected' : ''}>Activo</option>
                            <option value="inactivo" ${userStatus === 'inactivo' ? 'selected' : ''}>Inactivo</option>
                        </select>
                        <small style="color: #666; font-size: 12px;">Los usuarios inactivos no pueden acceder al sistema</small>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">
                            Permisos de administración
                        </label>
                        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                            <label style="display: flex; align-items: center; cursor: pointer; font-weight: 500; color: #333; gap: 10px;">
                                <input type="checkbox" id="perfil-can-view-users-real" ${userCanViewUsers ? 'checked' : ''} style="width: 18px; height: 18px;">
                                <span>Permitir ver lista de usuarios</span>
                            </label>
                            <label style="display: flex; align-items: center; cursor: pointer; font-weight: 500; color: #333; gap: 10px;">
                                <input type="checkbox" id="perfil-can-view-reports-real" ${userCanViewReports ? 'checked' : ''} style="width: 18px; height: 18px;">
                                <span>Permitir ver reportes de tareas</span>
                            </label>
                        </div>
                        <small style="color: #666; font-size: 12px;">Estos permisos controlan el acceso a funcionalidades administrativas</small>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">
                            Nueva contraseña
                        </label>
                        <input type="password" id="perfil-password-real" placeholder="Deja vacío para mantener la actual" style="
                            width: 100%;
                            padding: 12px;
                            border: 1px solid #ddd;
                            border-radius: 8px;
                            font-size: 14px;
                            box-sizing: border-box;
                        ">
                        <small style="color: #666; font-size: 12px;">Mínimo 8 caracteres</small>
                    </div>
                    
                    <div style="margin-bottom: 25px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">
                            Confirmar nueva contraseña
                        </label>
                        <input type="password" id="confirmar-perfil-password-real" placeholder="Confirma la nueva contraseña" style="
                            width: 100%;
                            padding: 12px;
                            border: 1px solid #ddd;
                            border-radius: 8px;
                            font-size: 14px;
                            box-sizing: border-box;
                        ">
                    </div>
                    
                    <div style="
                        display: flex;
                        gap: 10px;
                        justify-content: flex-end;
                    ">
                        <button type="button" onclick="cerrarModalEditarPerfilReal()" style="
                            background: #6c757d;
                            color: white;
                            border: none;
                            padding: 12px 20px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 14px;
                        ">
                            <i class="bi bi-x-circle"></i> Cancelar
                        </button>
                        <button type="submit" style="
                            background: #007bff;
                            color: white;
                            border: none;
                            padding: 12px 20px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 14px;
                        ">
                            <i class="bi bi-check-circle"></i> Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Agregar el modal al body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('Modal de editar perfil creado y agregado al DOM');
    
    // Bloquear el scroll del body
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Agregar event listener para cerrar al hacer clic fuera del modal
    setTimeout(() => {
        const modal = document.getElementById('modal-editar-perfil-real');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    cerrarModalEditarPerfilReal();
                }
            });
            
            // Agregar event listener para cerrar con Escape
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    cerrarModalEditarPerfilReal();
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        }
    }, 100);
}

function cerrarModalTest() {
    const modal = document.getElementById('modal-test');
    if (modal) {
        modal.remove();
        console.log('Modal de prueba cerrado');
    }
}

function cerrarModalEditarPerfilReal() {
    const modal = document.getElementById('modal-editar-perfil-real');
    if (modal) {
        modal.remove();
        console.log('Modal de editar perfil cerrado');
    }
    // Restaurar el scroll del body
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    
    // Limpiar cualquier event listener de Escape que pueda estar activo
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.removeEventListener('keydown', handleEscape);
}

async function editarPerfilDesdeModalReal(e) {
    e.preventDefault();
    
    const userId = document.getElementById('usuario-id-a-editar').value;
    const nombre = document.getElementById('perfil-nombre-real').value.trim();
    const username = document.getElementById('perfil-username-real').value.trim();
    const status = document.getElementById('perfil-status-real').value;
    const canViewUsers = document.getElementById('perfil-can-view-users-real').checked;
    const canViewReports = document.getElementById('perfil-can-view-reports-real').checked;
    const password = document.getElementById('perfil-password-real').value;
    const confirmarPassword = document.getElementById('confirmar-perfil-password-real').value;
    
    console.log('Editando usuario ID:', userId, 'con nombre:', nombre);
    
    if (!nombre) {
        alert('Por favor, ingresa tu nombre');
        return;
    }
    
    if (password && password.length < 8) {
        alert('La contraseña debe tener al menos 8 caracteres');
        return;
    }
    
    if (password && password !== confirmarPassword) {
        alert('Las contraseñas no coinciden');
        return;
    }
    
    // Verificar que el token esté disponible
    if (!token) {
        alert('Error: No hay sesión activa. Por favor, inicia sesión nuevamente.');
        logout();
        return;
    }
    
    const datos = {
        name: nombre,
        user_id: userId,
        status: status,
        can_view_users: canViewUsers,
        can_view_reports: canViewReports
    };
    
    if (username) {
        datos.username = username;
    }
    
    if (password) {
        datos.password = password;
    }
    
    try {
        const response = await fetch('http://127.0.0.1:8000/api/usuario', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(datos),
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Actualizar los datos en localStorage si es el usuario logueado
            const userData = localStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                if (user.id == userId) {
                    user.name = nombre;
                    if (username) {
                        user.username = username;
                    }
                    user.status = status;
                    localStorage.setItem('user', JSON.stringify(user));
                    // Actualizar la bienvenida si es el usuario logueado
                    document.getElementById('bienvenida').innerHTML = `👤 Bienvenido, ${nombre}`;
                }
            }
            
            // Actualizar la lista de usuarios en memoria
            if (todosLosUsuarios && todosLosUsuarios.length > 0) {
                const usuarioIndex = todosLosUsuarios.findIndex(u => u.id == userId);
                if (usuarioIndex !== -1) {
                    todosLosUsuarios[usuarioIndex].name = nombre;
                    if (username) {
                        todosLosUsuarios[usuarioIndex].username = username;
                    }
                    todosLosUsuarios[usuarioIndex].status = status;
                    todosLosUsuarios[usuarioIndex].can_view_users = canViewUsers;
                    todosLosUsuarios[usuarioIndex].can_view_reports = canViewReports;
                    // Recargar la lista de usuarios en la interfaz
                    mostrarUsuarios(todosLosUsuarios);
                }
            }
            
            mostrarMensajeExito('✅ Perfil actualizado exitosamente');
            cerrarModalEditarPerfilReal();
        } else {
            const errorData = await response.text();
            console.error('Error del servidor:', response.status, errorData);
            alert(`Error al actualizar el perfil (${response.status}): ${errorData}`);
        }
    } catch (error) {
        console.error('Error de red:', error);
        alert(`Error de conexión: ${error.message}`);
    }
}

function cancelarEdicion(){
    document.getElementById('perfil-section').style.display = 'none';
    document.getElementById('tareas-section').style.display = 'block';
}

function cerrarModalEditarPerfil(){
    const modal = document.getElementById('modal-editar-perfil');
    modal.style.display = 'none';
    
    // Limpiar el formulario
    document.getElementById('form-editar-perfil-modal').reset();
}

function getColor(prioridad){
    if (prioridad === 'alta') return 'red';
    if (prioridad === 'media') return 'orange';
    if (prioridad === 'baja') return 'green';
    return 'gray';
}

function mostrarMensajeExito(texto){
    const mensaje = document.getElementById('mensaje-exito');
    mensaje.textContent = texto;
    mensaje.style.display = 'block';

    mensaje.classList.remove('toast-exito');
    void mensaje.offsetWidth;
    mensaje.classList.add('toast-exito');

    setTimeout(() => {
        mensaje.style.display = 'none';
    }, 3000);
}

function mostrarNotificacion(texto){
    const notificacion = document.getElementById('notificacion-tareas');
    notificacion.textContent = texto;

    notificacion.style.display = 'block';
    notificacion.style.animtion = 'none';

    void notificacion.offsetWidth;
    notificacion.style.animation = 'fadeInOut 3s forwards';

    setTimeout(() => {
        notificacion.style.display = 'none';
    }, 3000);
}

function notificarTareasProximas(tasks){
    const now = new Date();

    const proximas = tasks.filter(task => {
        if (!task.completada && task.fecha_limite){
            const deadline = new Date(task.fecha_limite);
            const diff = deadline - now;
            return diff > 0 && diff <= 86400000;
        }
        return false;
    });

    if (proximas.length > 0){
        const titles = proximas.map(task => task.titulo).join(', ');
        mostrarNotificacion(`Tienes ${proximas.length} tarea(s) próximas a vencer: ${titles}`);
    }
}

function cambiarPagina(nuevaPagina){
    paginaActual = nuevaPagina;
    cargarTareas();
}

function actualizarGrafico(completadas, pendientes){
    const ctx = document.getElementById('grafico-tareas').getContext('2d');

    if (grafico){
        grafico.destroy();
    }

    grafico = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Completadas', 'Pendientes'],
            datasets: [{
                data:[completadas, pendientes],
                backgroundColor: ['#28a745', '#ffc107'],
                borderWidth: 1,
            }]
        },
        options:{
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        fontSize: 12,
                        fontColor: '#333',
                    },
                },
                title: {
                    display: true,
                    text: 'Estado de las tareas',
                    fontSize: 14,
                    fontColor: '#333',
                },
            },
        }
    });
}

function toggleGrafico(){
    const modal = document.getElementById('modal-overlay');
    const isVisible = modal.classList.contains('show');

    if (isVisible){
        // Animación de cierre
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // Esperar a que termine la animación
    } else {
        modal.style.display = 'flex';
        // Pequeño delay para que el display: flex se aplique antes de la animación
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        // Actualizar el gráfico cuando se abre el modal
        // Usar los conteos del contador que ya están actualizados
        const contadorTexto = document.getElementById('contador-tareas').innerHTML;
        const match = contadorTexto.match(/Total : (\d+) \| Pendientes : (\d+) \| Completadas : (\d+)/);
        
        if (match) {
            const total = parseInt(match[1]);
            const pendientes = parseInt(match[2]);
            const completadas = parseInt(match[3]);
            actualizarGrafico(completadas, pendientes);
        } else {
            // Fallback si no se puede parsear el texto
            const total = document.querySelectorAll('#lista-tareas li').length;
            const completadas = document.querySelectorAll('#lista-tareas li input[type="checkbox"]:checked').length;
            const pendientes = total - completadas;
            actualizarGrafico(completadas, pendientes);
        }
    }
}

function compartirTareaDirecto(tareaId) {
    console.log('Función compartirTareaDirecto llamada con tareaId:', tareaId);
    
    // Crear modal dinámicamente
    const modalHTML = `
        <div id="modal-compartir-dinamico" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 999999;
        ">
            <div style="
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                max-width: 400px;
                width: 90%;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            ">
                <h3 style="margin-bottom: 15px; color: #333;">Compartir Tarea</h3>
                <p style="margin-bottom: 20px; color: #666;">Ingresa el nombre de usuario con quien quieres compartir esta tarea:</p>
                <input type="text" id="input-compartir-dinamico" placeholder="Nombre de usuario" style="
                    width: 100%;
                    padding: 12px;
                    border: 1px solid #ccc;
                    border-radius: 6px;
                    margin-bottom: 20px;
                    font-size: 16px;
                    box-sizing: border-box;
                ">
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="confirmarCompartirDinamico(${tareaId})" style="
                        padding: 10px 20px;
                        background-color: #28a745;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 16px;
                    ">Compartir</button>
                    <button onclick="cerrarModalDinamico()" style="
                        padding: 10px 20px;
                        background-color: #6c757d;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 16px;
                    ">Cancelar</button>
                </div>
            </div>
        </div>
    `;
    
    // Agregar el modal al body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Enfocar el input
    setTimeout(() => {
        const input = document.getElementById('input-compartir-dinamico');
        if (input) {
            input.focus();
        }
    }, 100);
    
    console.log('Modal dinámico creado y mostrado');
}

function cerrarModalDinamico() {
    const modal = document.getElementById('modal-compartir-dinamico');
    if (modal) {
        modal.remove();
    }
}

async function confirmarCompartirDinamico(tareaId) {
    const input = document.getElementById('input-compartir-dinamico');
    const username = input ? input.value.trim() : '';
    
    if (!username) {
        alert('Por favor, ingresa un nombre de usuario');
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/${tareaId}/compartir`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ username }),
        });

        if (await manejarErrorAutenticacion(res)) return;

        if (res.ok) {
            mostrarMensajeCompartido();
            cerrarModalDinamico(); // Cerrar el modal dinámico correctamente
            cargarTareas();
        } else {
            const errorData = await res.json();
            alert('Error al compartir la tarea: ' + (errorData.message || 'Error desconocido'));
        }
    } catch (error) {
        console.error('Error al compartir tarea:', error);
        alert('Error al compartir la tarea: ' + error.message);
    }
}

function mostrarMensajeCompartido(){
    const toast = document.getElementById('mensajeCompartida');
    toast.classList.remove('oculto');
    toast.classList.add('mostrar');

    setTimeout(() => {
        toast.classList.remove('mostrar');
        toast.classList.add('oculto');
    }, 3000);
}

// Función para reiniciar el temporizador de inactividad
function reiniciarTemporizadorInactividad() {
    console.log('Reiniciando temporizador de inactividad...');
    
    if (temporizadorInactividad) {
        clearTimeout(temporizadorInactividad);
        console.log('Temporizador anterior limpiado');
    }
    
    temporizadorInactividad = setTimeout(() => {
        console.log('¡TIEMPO DE INACTIVIDAD AGOTADO! Cerrando sesión...');
        logout();
    }, tiempoInactividad);
    
    console.log('Nuevo temporizador iniciado para', tiempoInactividad, 'ms');
}

// Función para iniciar el monitoreo de inactividad
function iniciarMonitoreoInactividad() {
    console.log('Iniciando monitoreo de inactividad...');
    
    // Eventos que indican actividad del usuario
    const eventos = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    eventos.forEach(evento => {
        document.addEventListener(evento, reiniciarTemporizadorInactividad, true);
    });
    
    console.log('Event listeners agregados para:', eventos);
    
    // Iniciar el temporizador
    reiniciarTemporizadorInactividad();
}

function cerrarSesionPorInactividad(){
    console.log('Cerrando sesión por inactividad...');
    alert('Sesión cerrada por inactividad. Por favor, inicia sesión nuevamente.');
    logout();
}

// Funciones para la gestión de usuarios
function irAUsuarios() {
    console.log('🚀 Navegando a Ver Usuarios...');
    
    // Verificar si el usuario está logueado
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('⚠️ Usuario no logueado, mostrando login');
        mostrarSeccion('login-section');
        return;
    }
    
    // Verificar permisos para acceder a la gestión de usuarios
    const userData = localStorage.getItem('user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            if (!user.can_view_users) {
                alert('No tienes permisos para acceder a esta funcionalidad');
                console.log('❌ Acceso denegado a Ver Usuarios - sin permisos para usuario ID:', user.id);
                return;
            }
        } catch (e) {
            console.error('Error al parsear datos del usuario:', e);
            alert('Error al verificar permisos');
            return;
        }
    }
    
    // Mostrar sección de usuarios
    mostrarSeccion('usuarios-section');
    
    // Cargar usuarios
    cargarUsuarios();
}

function volverATareas() {
    console.log('🚀 Volviendo a Mis Tareas...');
    
    // Mostrar sección de tareas
    mostrarSeccion('tareas-section');
    
    // Recargar tareas
    if (typeof cargarTareas === 'function') {
        cargarTareas();
    }
}

async function cargarUsuarios() {
    try {
        console.log('🔍 Cargando usuarios...');
        console.log('Token:', token ? 'Presente' : 'Ausente');
        console.log('URL:', 'http://127.0.0.1:8000/api/usuarios');
        
        const response = await fetch('http://127.0.0.1:8000/api/usuarios', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            const usuarios = await response.json();
            console.log('Usuarios obtenidos:', usuarios);
            todosLosUsuarios = usuarios;
            usuariosFiltrados = usuarios;
            mostrarUsuarios(usuarios);
            actualizarEstadisticasUsuarios(usuarios);
        } else {
            const errorData = await response.text();
            console.error('Error del servidor:', response.status, errorData);
            document.getElementById('usuarios-list').innerHTML = `<p class="text-center">Error al cargar usuarios (${response.status}): ${errorData}</p>`;
        }
    } catch (error) {
        console.error('Error de red:', error);
        document.getElementById('usuarios-list').innerHTML = `<p class="text-center">Error de conexión: ${error.message}</p>`;
    }
}

function mostrarUsuarios(usuarios) {
    const usuariosList = document.getElementById('usuarios-list');
    
    if (!usuarios || usuarios.length === 0) {
        usuariosList.innerHTML = '<p class="text-center">No hay usuarios registrados</p>';
        return;
    }
    
    // Obtener el ID del usuario logueado desde el token o localStorage
    const usuarioLogueadoId = obtenerUsuarioLogueadoId();
    console.log('Usuario logueado ID:', usuarioLogueadoId);
    console.log('Usuarios disponibles:', usuarios.map(u => ({ id: u.id, name: u.name })));
    
    const usuariosHTML = usuarios.map(usuario => {
        const esUsuarioLogueado = usuario.id === usuarioLogueadoId;
        console.log(`Usuario ${usuario.name} (ID: ${usuario.id}) - Es logueado: ${esUsuarioLogueado}`);
        console.log(`Comparando: ${usuario.id} === ${usuarioLogueadoId} = ${esUsuarioLogueado}`);
        
        return `
            <div class="usuario-card">
                <div class="usuario-info">
                    <div class="usuario-avatar">
                        ${usuario.name ? usuario.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div class="usuario-details">
                        <h3>${usuario.name || 'Sin nombre'}</h3>
                        <p>ID: ${usuario.id} | Username: ${usuario.username || 'N/A'}</p>
                        <p class="usuario-permissions">
                            <span class="permission-badge ${usuario.can_view_users ? 'granted' : 'denied'}">
                                <i class="bi ${usuario.can_view_users ? 'bi-eye-fill' : 'bi-eye-slash'}"></i>
                                Ver Usuarios
                            </span>
                            <span class="permission-badge ${usuario.can_view_reports ? 'granted' : 'denied'}">
                                <i class="bi ${usuario.can_view_reports ? 'bi-graph-up' : 'bi-graph-down'}"></i>
                                Ver Reportes
                            </span>
                        </p>
                    </div>
                </div>
                <div class="usuario-status">
                    <span class="status-badge ${usuario.status === 'activo' ? 'activo' : 'inactivo'}">${usuario.status === 'activo' ? 'ACTIVO' : 'INACTIVO'}</span>
                    <button class="btn-edit-perfil" onclick="editarPerfil(${usuario.id})" style="background-color: #007bff !important; color: white !important; border: 1px solid #0056b3 !important; padding: 4px 12px !important; border-radius: 20px !important; font-size: 0.8rem !important; cursor: pointer !important; display: flex !important; align-items: center !important; gap: 4px !important; font-weight: 600 !important; text-decoration: none !important; outline: none !important; text-transform: uppercase !important;">
                        <i class="bi bi-person-circle"></i> Editar Perfil
                    </button>
                </div>
                <div class="usuario-actions">
                    <button class="btn-edit-usuario" onclick="editarUsuario(${usuario.id})">
                        <i class="bi bi-pencil"></i> Editar
                    </button>
                    <button class="btn-delete-usuario" onclick="eliminarUsuario(${usuario.id})">
                        <i class="bi bi-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    usuariosList.innerHTML = usuariosHTML;
}

function actualizarEstadisticasUsuarios(usuarios) {
    const total = usuarios.length;
    const activos = usuarios.filter(u => u.status === 'activo').length;
    const inactivos = usuarios.filter(u => u.status === 'inactivo').length;
    
    document.getElementById('total-usuarios').textContent = total;
    document.getElementById('usuarios-activos').textContent = activos;
    document.getElementById('usuarios-inactivos').textContent = inactivos;
}

function editarUsuario(id) {
    console.log('Editar usuario:', id);
    alert(`Función de editar usuario ${id} - En desarrollo`);
}



function obtenerUsuarioLogueadoId() {
    console.log('=== OBTENIENDO ID DE USUARIO LOGUEADO ===');
    
    // Intentar obtener el ID del usuario desde localStorage
    const userData = localStorage.getItem('user');
    console.log('Datos de usuario en localStorage:', userData);
    
    if (userData) {
        try {
            const user = JSON.parse(userData);
            console.log('Usuario parseado:', user);
            console.log('ID del usuario:', user.id);
            return user.id;
        } catch (e) {
            console.error('Error al parsear datos del usuario:', e);
        }
    }
    
    console.log('No se pudo obtener el ID del usuario desde localStorage');
    return null;
}

function eliminarUsuario(id) {
    console.log('Eliminar usuario:', id);
    if (confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
        alert(`Función de eliminar usuario ${id} - En desarrollo`);
    }
}

// Variables para almacenar usuarios
let todosLosUsuarios = [];
let usuariosFiltrados = [];

function buscarUsuarios() {
    const busqueda = document.getElementById('buscador-usuarios').value.toLowerCase();
    const filtro = document.getElementById('filtro-estado-usuarios').value;
    
    usuariosFiltrados = todosLosUsuarios.filter(usuario => {
        const coincideBusqueda = usuario.name.toLowerCase().includes(busqueda) ||
                                (usuario.username && usuario.username.toLowerCase().includes(busqueda));
        
        let coincideFiltro = true;
        if (filtro === 'activos') {
            coincideFiltro = true; // Por ahora todos están activos
        } else if (filtro === 'inactivos') {
            coincideFiltro = false; // Por ahora no hay inactivos
        }
        
        return coincideBusqueda && coincideFiltro;
    });
    
    mostrarUsuarios(usuariosFiltrados);
    actualizarEstadisticasUsuarios(usuariosFiltrados);
}

function filtrarUsuarios() {
    buscarUsuarios(); // Reutilizar la función de búsqueda
}

// Funciones para crear usuario
function abrirModalCrearUsuario() {
    const modal = document.getElementById('modal-crear-usuario');
    
    if (!modal) {
        alert('Error: Modal no encontrado. Recarga la página.');
        return;
    }
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Enfocar el primer campo
    setTimeout(() => {
        const nombreField = document.getElementById('nombre-usuario-modal');
        if (nombreField) {
            nombreField.focus();
        }
    }, 300);
}

function cerrarModalCrearUsuario() {
    const modal = document.getElementById('modal-crear-usuario');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
    
    // Limpiar el formulario
    document.getElementById('form-usuario-modal').reset();
}

async function crearUsuarioDesdeModal() {
    const nombre = document.getElementById('nombre-usuario-modal').value.trim();
    const username = document.getElementById('username-usuario-modal').value.trim();
    const password = document.getElementById('password-usuario-modal').value;
    const confirmarPassword = document.getElementById('confirmar-password-usuario-modal').value;
    const email = document.getElementById('email-usuario-modal').value.trim();
    
    // Validaciones
    if (!nombre) {
        alert('Por favor, ingresa el nombre completo');
        return;
    }
    
    if (!username) {
        alert('Por favor, ingresa el nombre de usuario');
        return;
    }
    
    if (!password) {
        alert('Por favor, ingresa la contraseña');
        return;
    }
    
    if (password.length < 8) {
        alert('La contraseña debe tener al menos 8 caracteres');
        return;
    }
    
    if (password !== confirmarPassword) {
        alert('Las contraseñas no coinciden');
        return;
    }
    
    // Verificar que el token esté disponible
    if (!token) {
        alert('Error: No hay sesión activa. Por favor, inicia sesión nuevamente.');
        logout();
        return;
    }
    
    const userData = {
        name: nombre,
        username: username,
        password: password
    };
    
    if (email) {
        userData.email = email;
    }
    
    try {
        const response = await fetch('http://127.0.0.1:8000/api/register', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });
        
        if (response.ok) {
            const nuevoUsuario = await response.json();
            mostrarMensajeExito('✅ Usuario creado exitosamente');
            cerrarModalCrearUsuario();
            cargarUsuarios(); // Recargar la lista de usuarios
        } else {
            const errorData = await response.text();
            console.error('Error del servidor:', response.status, errorData);
            alert(`Error al crear usuario (${response.status}): ${errorData}`);
        }
    } catch (error) {
        console.error('Error de red:', error);
        alert(`Error de conexión: ${error.message}`);
    }
}

function toggleFormulario() {
    // Abre el modal flotante
    abrirModalCrearTarea();
}

function abrirModalCrearTarea() {
    const modal = document.getElementById('modal-crear-tarea');
    
    if (!modal) {
        alert('Error: Modal no encontrado. Recarga la página.');
        return;
    }
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevenir scroll del body
    
    // Enfocar el primer campo
    setTimeout(() => {
        const tituloField = document.getElementById('titulo-modal');
        if (tituloField) {
            tituloField.focus();
        }
    }, 300);
}

function cerrarModalCrearTarea() {
    const modal = document.getElementById('modal-crear-tarea');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto'; // Restaurar scroll del body
    
    // Limpiar el formulario
    document.getElementById('form-tarea-modal').reset();
}

// Event listener para el formulario del modal
document.addEventListener('DOMContentLoaded', () => {
    const formModal = document.getElementById('form-tarea-modal');
    if (formModal) {
        formModal.onsubmit = async (e) => {
            e.preventDefault();
            await crearTareaDesdeModal();
        };
    }
    
    // Cerrar modal al hacer clic fuera de él
    const modalCrearTarea = document.getElementById('modal-crear-tarea');
    if (modalCrearTarea) {
        modalCrearTarea.addEventListener('click', (e) => {
            if (e.target === modalCrearTarea) {
                cerrarModalCrearTarea();
            }
        });
    }
    
    // Cerrar modales con la tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modalTarea = document.getElementById('modal-crear-tarea');
            const modalUsuario = document.getElementById('modal-crear-usuario');
            
            if (modalTarea && modalTarea.classList.contains('show')) {
                cerrarModalCrearTarea();
            } else if (modalUsuario && modalUsuario.classList.contains('show')) {
                cerrarModalCrearUsuario();
            }
        }
    });
    
    // Event listeners para usuarios
    const buscadorUsuarios = document.getElementById('buscador-usuarios');
    if (buscadorUsuarios) {
        buscadorUsuarios.addEventListener('input', buscarUsuarios);
    }
    
    const filtroEstadoUsuarios = document.getElementById('filtro-estado-usuarios');
    if (filtroEstadoUsuarios) {
        filtroEstadoUsuarios.addEventListener('change', filtrarUsuarios);
    }
    
    // Event listener para el formulario de crear usuario
    const formUsuarioModal = document.getElementById('form-usuario-modal');
    if (formUsuarioModal) {
        formUsuarioModal.onsubmit = async (e) => {
            e.preventDefault();
            await crearUsuarioDesdeModal();
        };
    }
    
    // Cerrar modal de crear usuario al hacer clic fuera de él
    const modalCrearUsuario = document.getElementById('modal-crear-usuario');
    if (modalCrearUsuario) {
        modalCrearUsuario.addEventListener('click', (e) => {
            if (e.target === modalCrearUsuario) {
                cerrarModalCrearUsuario();
            }
        });
    }
});

async function crearTareaDesdeModal() {
    const titulo = document.getElementById('titulo-modal').value;
    const descripcion = document.getElementById('descripcion-modal').value;
    const prioridad = document.getElementById('prioridad-modal').value;
    const fechaLimite = document.getElementById('fecha-limite-modal').value;
    const archivo = document.getElementById('archivo-modal').files[0];
    
    if (!titulo.trim()) {
        alert('Por favor, ingresa un título para la tarea');
        return;
    }
    
    // Verificar que el token esté disponible
    if (!token) {
        alert('Error: No hay sesión activa. Por favor, inicia sesión nuevamente.');
        logout();
        return;
    }
    
    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('descripcion', descripcion);
    formData.append('prioridad', prioridad);
    if (fechaLimite) {
        formData.append('fecha_limite', fechaLimite);
    }
    if (archivo) {
        formData.append('archivo', archivo);
    }
    
    // Debug: mostrar datos que se van a enviar
    console.log('Enviando tarea:', {
        titulo,
        descripcion,
        prioridad,
        fechaLimite,
        archivo: archivo ? archivo.name : 'No archivo',
        url: API_URL,
        token: token ? 'Presente' : 'Ausente'
    });
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });
        
        if (response.ok) {
            mostrarMensajeExito('✅ Tarea creada exitosamente');
            cerrarModalCrearTarea();
            cargarTareas();
        } else {
            const errorData = await response.text();
            console.error('Error del servidor:', response.status, errorData);
            alert(`Error al crear la tarea (${response.status}): ${errorData}`);
        }
    } catch (error) {
        console.error('Error de red:', error);
        alert(`Error de conexión: ${error.message}`);
    }
}

// Agregar event listener para el buscador con debounce
document.getElementById('buscador').addEventListener('input', buscarTareas);

// Event listener para cerrar el modal al hacer clic fuera de él
document.getElementById('modal-eliminar').addEventListener('click', function(e) {
    if (e.target.id === 'modal-eliminar') {
        cancelarEliminar();
    }
});

// Event listener para cerrar el modal de compartir al hacer clic fuera de él
document.getElementById('modal-compartir').addEventListener('click', function(e) {
    if (e.target.id === 'modal-compartir') {
        cancelarCompartir();
    }
});

// Event listener para cerrar el modal del gráfico al hacer clic fuera de él
document.getElementById('modal-overlay').addEventListener('click', function(e) {
    if (e.target.id === 'modal-overlay') {
        toggleGrafico();
    }
});

// Event listener directo para el botón de cerrar sesión
document.addEventListener('DOMContentLoaded', function() {
    const botonLogout = document.querySelector('button[onclick="logout()"]');
    if (botonLogout) {
        console.log('Botón de logout encontrado, agregando event listener...');
        botonLogout.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Botón de logout clickeado (event listener)');
            logout();
        });
    } else {
        console.log('Botón de logout NO encontrado');
    }
    
    // Event listener para el formulario de editar perfil
    const formEditarPerfil = document.getElementById('form-editar-perfil-modal');
    if (formEditarPerfil) {
        formEditarPerfil.addEventListener('submit', editarPerfilDesdeModal);
    }
});

async function editarPerfilDesdeModal(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('perfil-nombre-modal').value.trim();
    const password = document.getElementById('perfil-password-modal').value;
    const confirmarPassword = document.getElementById('confirmar-perfil-password-modal').value;
    
    if (!nombre) {
        alert('Por favor, ingresa tu nombre');
        return;
    }
    
    if (password && password.length < 8) {
        alert('La contraseña debe tener al menos 8 caracteres');
        return;
    }
    
    if (password && password !== confirmarPassword) {
        alert('Las contraseñas no coinciden');
        return;
    }
    
    // Verificar que el token esté disponible
    if (!token) {
        alert('Error: No hay sesión activa. Por favor, inicia sesión nuevamente.');
        logout();
        return;
    }
    
    const datos = {
        name: nombre,
        user_id: obtenerUsuarioLogueadoId()
    };
    
    if (password) {
        datos.password = password;
    }
    
    try {
        const response = await fetch('http://127.0.0.1:8000/api/usuario', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(datos),
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Actualizar los datos en localStorage
            const userData = localStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                user.name = nombre;
                localStorage.setItem('user', JSON.stringify(user));
            }
            
            // Actualizar la bienvenida
            document.getElementById('bienvenida').innerHTML = `👤 Bienvenido, ${nombre}`;
            
            mostrarMensajeExito('✅ Perfil actualizado exitosamente');
            cerrarModalEditarPerfil();
        } else {
            const errorData = await response.text();
            console.error('Error del servidor:', response.status, errorData);
            alert(`Error al actualizar el perfil (${response.status}): ${errorData}`);
        }
    } catch (error) {
        console.error('Error de red:', error);
        alert(`Error de conexión: ${error.message}`);
    }
}

// Función helper para ocultar todas las secciones
function ocultarTodasLasSecciones() {
    const secciones = [
        'login-section',
        'tareas-section', 
        'perfil-section',
        'usuarios-section',
        'reportes-section'
    ];
    
    secciones.forEach(seccionId => {
        const seccion = document.getElementById(seccionId);
        if (seccion) {
            seccion.style.display = 'none';
            console.log(`✓ Sección ${seccionId} ocultada`);
        }
    });
    
    // También cerrar cualquier modal que esté abierto
    const modales = document.querySelectorAll('.modal, .modal-dinamico');
    modales.forEach(modal => {
        if (modal.style.display === 'block' || modal.classList.contains('show')) {
            modal.style.display = 'none';
            modal.classList.remove('show');
            console.log('✓ Modal cerrado:', modal.id || 'sin id');
        }
    });
}

// Función helper para mostrar una sección específica
function mostrarSeccion(seccionId) {
    ocultarTodasLasSecciones();
    const seccion = document.getElementById(seccionId);
    if (seccion) {
        seccion.style.display = 'block';
        console.log(`✅ Sección ${seccionId} mostrada correctamente`);
    }
}