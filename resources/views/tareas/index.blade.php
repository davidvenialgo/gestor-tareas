@php
    use Carbon\Carbon;
@endphp

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Tareas</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .tarea-vencida {
            background: linear-gradient(135deg, #ff6b6b, #ee5a52);
            border: 2px solid #dc3545;
            color: white;
            position: relative;
        }
        .tarea-vencida::before {
            content: "⚠️ VENCIDA";
            position: absolute;
            top: 10px;
            right: 10px;
            background: #dc3545;
            color: #fff;
            padding: 2px 10px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: bold;
        }
    </style>
</head>
<body>
<div class="container mt-4">
    <h1>Lista de Tareas</h1>
    <div class="row">
        @foreach($tareas as $tarea)
            @php
                $vencida = !$tarea['completada'] && isset($tarea['fecha_limite']) && $tarea['fecha_limite'] && \Carbon\Carbon::parse($tarea['fecha_limite'])->isPast();
            @endphp
            <pre>{{ var_export($tarea, true) }}</pre>
            <div class="col-md-6 mb-3">
                <div class="card {{ $vencida ? 'tarea-vencida' : '' }}">
                    <div class="card-body">
                        <h5 class="card-title">{{ $tarea['titulo'] }}</h5>
                        <p><strong>¿Vencida?</strong> {{ $vencida ? 'SÍ' : 'NO' }}</p>
                        <p>{{ $tarea['descripcion'] ?? '' }}</p>
                        <p><strong>Fecha límite:</strong> {{ $tarea['fecha_limite'] ?? 'Sin fecha' }}</p>
                        <p><strong>Completada:</strong> {{ $tarea['completada'] ? 'Sí' : 'No' }}</p>
                    </div>
                </div>
            </div>
        @endforeach
    </div>
</div>
</body>
</html> 