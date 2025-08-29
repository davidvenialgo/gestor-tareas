<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestor de Tareas</title>
    <link rel="stylesheet" href="{{ asset('style.css') }}">
    <link rel="icon" type="image/x-icon" href="{{ asset('favicon.ico') }}">
</head>
<body>
    <!-- Sección de Login -->
    <div id="login-section" class="login-container">
        <div class="login-box">
            <h2>Iniciar Sesión</h2>
            <form id="form-login">
                <div class="input-group">
                    <input type="text" id="username" placeholder="Usuario" required>
                </div>
                <div class="input-group">
                    <input type="password" id="password" placeholder="Contraseña" required>
                </div>
                <button type="submit" class="login-btn">Iniciar sesión</button>
            </form>
        </div>
    </div>

    <!-- Sección de Tareas (inicialmente oculta) -->
    <div id="tareas-section" style="display: none;">
        <!-- Header -->
        <header class="header">
            <div class="header-content">
                <div class="header-left">
                    <button id="sidebar-toggle" class="sidebar-toggle" style="display: none;">☰</button>
                    <h1 id="bienvenida">👤 Bienvenido</h1>
                </div>
                <div class="header-right">
                    <button onclick="logout()" class="logout-btn">Cerrar Sesión</button>
                </div>
            </div>
        </header>

        <!-- Sidebar -->
        <div id="sidebar" class="sidebar">
            <div class="sidebar-header">
                <h3>Menú</h3>
                <button id="sidebar-close" class="sidebar-close">×</button>
            </div>
            <nav class="sidebar-nav">
                <ul>
                    <li><a href="#" onclick="mostrarSeccion('tareas')" class="menu-item active">📋 Tareas</a></li>
                    <li id="menu-ver-usuarios" style="display: none;"><a href="#" onclick="mostrarSeccion('usuarios')" class="menu-item">👥 Ver Usuarios</a></li>
                    <li id="menu-reportes" style="display: none;"><a href="#" onclick="mostrarSeccion('reportes')" class="menu-item">📊 Reportes</a></li>
                </ul>
            </nav>
        </div>

        <!-- Contenido principal -->
        <main class="main-content">
            <!-- Sección de Tareas -->
            <div id="seccion-tareas" class="seccion-activa">
                <div class="tareas-header">
                    <h2>📋 Gestión de Tareas</h2>
                    <div class="tareas-controls">
                        <button onclick="mostrarFormulario()" class="btn-agregar">➕ Agregar Tarea</button>
                        <div class="filtros">
                            <select id="filtro-tareas" onchange="cambiarFiltro()">
                                <option value="todas">Todas las tareas</option>
                                <option value="pendientes">Solo pendientes</option>
                                <option value="completadas">Solo completadas</option>
                            </select>
                            <select id="ordenar-por" onchange="cargarTareas()">
                                <option value="creacion">Ordenar por creación</option>
                                <option value="prioridad">Ordenar por prioridad</option>
                                <option value="fecha">Ordenar por fecha límite</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="buscador-container">
                    <input type="text" id="buscador" placeholder="🔍 Buscar tareas..." oninput="buscarTareas()">
                </div>

                <div id="contador-tareas" class="contador-tareas"></div>

                <div id="lista-tareas" class="lista-tareas"></div>

                <div id="paginacion" class="paginacion"></div>
            </div>

            <!-- Sección de Usuarios -->
            <div id="seccion-usuarios" class="seccion-oculta">
                <h2>👥 Gestión de Usuarios</h2>
                <div id="lista-usuarios" class="lista-usuarios"></div>
            </div>

            <!-- Sección de Reportes -->
            <div id="seccion-reportes" class="seccion-oculta">
                <h2>📊 Reportes</h2>
                <div class="reportes-container">
                    <div class="grafico-container">
                        <canvas id="grafico-tareas"></canvas>
                    </div>
                    <div id="estadisticas" class="estadisticas"></div>
                </div>
            </div>
        </main>

        <!-- Modal para agregar/editar tarea -->
        <div id="modal-tarea" class="modal">
            <div class="modal-content">
                <span class="close" onclick="cerrarModal()">&times;</span>
                <h2 id="modal-titulo">Agregar Nueva Tarea</h2>
                <form id="form-tarea">
                    <div class="form-group">
                        <label for="titulo">Título:</label>
                        <input type="text" id="titulo" required>
                    </div>
                    <div class="form-group">
                        <label for="descripcion">Descripción:</label>
                        <textarea id="descripcion" rows="3"></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="prioridad">Prioridad:</label>
                            <select id="prioridad">
                                <option value="baja">Baja</option>
                                <option value="media">Media</option>
                                <option value="alta">Alta</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="fecha_limite">Fecha Límite:</label>
                            <input type="datetime-local" id="fecha_limite">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="archivo">Archivo:</label>
                        <input type="file" id="archivo">
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn-guardar">Guardar</button>
                        <button type="button" onclick="cerrarModal()" class="btn-cancelar">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Modal de confirmación para eliminar -->
        <div id="modal-confirmar" class="modal">
            <div class="modal-content">
                <h3>Confirmar Eliminación</h3>
                <p>¿Estás seguro de que quieres eliminar esta tarea?</p>
                <div class="form-actions">
                    <button onclick="confirmarEliminacion()" class="btn-eliminar">Eliminar</button>
                    <button onclick="cerrarModalConfirmacion()" class="btn-cancelar">Cancelar</button>
                </div>
            </div>
        </div>
    </div>

    <script src="{{ asset('script.js') }}"></script>
</body>
</html>
