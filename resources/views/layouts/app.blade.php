<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mi Sistema de Tareas</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    {{-- Contenido dinámico --}}
    @yield('content')

    {{-- Script de cierre por inactividad --}}
    <form id="logout-form" action="{{ route('logout') }}" method="POST" style="display: none;">
        @csrf
    </form>
    <script>
        //const tiempoInactividad = 15 * 60 * 1000; // 15 minutos
        //const tiempoInactividad = 10 * 1000; // 10 segundos
        const tiempoInactividad = 30 * 60 * 1000; // 30 minutos
        let temporizadorInactividad;
        function resetearTemporizador() {
            clearTimeout(temporizadorInactividad);
            temporizadorInactividad = setTimeout(() => {
                alert('Tu sesión se cerró por inactividad.');
                document.getElementById('logout-form').submit();
            }, tiempoInactividad);
        }
        window.onload = resetearTemporizador;
        document.onmousemove = resetearTemporizador;
        document.onkeypress = resetearTemporizador;
        document.onclick = resetearTemporizador;
        document.onscroll = resetearTemporizador;
    </script>
</body>
</html>
