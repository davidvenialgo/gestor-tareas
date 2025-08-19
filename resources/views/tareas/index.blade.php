@php
    use Carbon\Carbon;
@endphp

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistema de Gestión de Tareas</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .main-container {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            margin: 20px;
            padding: 30px;
        }
        
        .page-title {
            color: #2c3e50;
            font-weight: 700;
            text-align: center;
            margin-bottom: 30px;
            font-size: 2.5rem;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .task-card {
            border: none;
            border-radius: 15px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            margin-bottom: 20px;
            overflow: hidden;
        }
        
        .task-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
        }
        
        .task-card.completed {
            background: linear-gradient(135deg, #56ab2f, #a8e6cf);
            color: white;
        }
        
        .task-card.overdue {
            background: linear-gradient(135deg, #ff6b6b, #ee5a52);
            color: white;
            position: relative;
        }
        
        .task-card.overdue::before {
            content: "⚠️ VENCIDA";
            position: absolute;
            top: 15px;
            right: 15px;
            background: #dc3545;
            color: #fff;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }
        
        .task-card.pending {
            background: linear-gradient(135deg, #f093fb, #f5576c);
            color: white;
        }
        
        .task-header {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .task-title {
            font-size: 1.4rem;
            font-weight: 600;
            margin: 0;
            color: inherit;
        }
        
        .task-body {
            padding: 20px;
        }
        
        .task-info {
            margin-bottom: 10px;
            display: flex;
            align-items: center;
        }
        
        .task-info i {
            margin-right: 10px;
            width: 20px;
            text-align: center;
        }
        
        .priority-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .priority-high {
            background: #dc3545;
            color: white;
        }
        
        .priority-medium {
            background: #ffc107;
            color: #212529;
        }
        
        .priority-low {
            background: #28a745;
            color: white;
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 15px;
            border-radius: 25px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-completed {
            background: #28a745;
            color: white;
        }
        
        .status-pending {
            background: #ffc107;
            color: #212529;
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #6c757d;
        }
        
        .empty-state i {
            font-size: 4rem;
            margin-bottom: 20px;
            opacity: 0.5;
        }
        
        .stats-container {
            background: rgba(255, 255, 255, 0.9);
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        
        .stat-item {
            text-align: center;
            padding: 15px;
        }
        
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .stat-label {
            color: #6c757d;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
    </style>
</head>
<body>
    <div class="container-fluid">
        <div class="main-container">
            <h1 class="page-title">
                <i class="fas fa-tasks me-3"></i>
                Sistema de Gestión de Tareas
            </h1>
            
            @if($tareas->count() > 0)
                <!-- Estadísticas -->
                <div class="stats-container">
                    <div class="row">
                        <div class="col-md-3 stat-item">
                            <div class="stat-number text-primary">{{ $tareas->count() }}</div>
                            <div class="stat-label">Total de Tareas</div>
                        </div>
                        <div class="col-md-3 stat-item">
                            <div class="stat-number text-success">{{ $tareas->where('completada', true)->count() }}</div>
                            <div class="stat-label">Completadas</div>
                        </div>
                        <div class="col-md-3 stat-item">
                            <div class="stat-number text-warning">{{ $tareas->where('completada', false)->count() }}</div>
                            <div class="stat-label">Pendientes</div>
                        </div>
                        <div class="col-md-3 stat-item">
                            <div class="stat-number text-danger">{{ $tareas->filter(function($tarea) { return !$tarea->completada && $tarea->fecha_limite && \Carbon\Carbon::parse($tarea->fecha_limite)->isPast(); })->count() }}</div>
                            <div class="stat-label">Vencidas</div>
                        </div>
                    </div>
                </div>
                
                <!-- Lista de Tareas -->
                <div class="row">
                    @foreach($tareas as $tarea)
                        @php
                            $vencida = !$tarea->completada && $tarea->fecha_limite && \Carbon\Carbon::parse($tarea->fecha_limite)->isPast();
                            $cardClass = 'task-card';
                            if ($tarea->completada) {
                                $cardClass .= ' completed';
                            } elseif ($vencida) {
                                $cardClass .= ' overdue';
                            } else {
                                $cardClass .= ' pending';
                            }
                        @endphp
                        
                        <div class="col-lg-6 col-xl-4 mb-4">
                            <div class="{{ $cardClass }}">
                                <div class="task-header">
                                    <h5 class="task-title">
                                        <i class="fas fa-clipboard-list me-2"></i>
                                        {{ $tarea->titulo }}
                                    </h5>
                                </div>
                                
                                <div class="task-body">
                                    @if($tarea->descripcion)
                                        <div class="task-info">
                                            <i class="fas fa-align-left"></i>
                                            <span>{{ $tarea->descripcion }}</span>
                                        </div>
                                    @endif
                                    
                                    <div class="task-info">
                                        <i class="fas fa-calendar-alt"></i>
                                        <strong>Fecha límite:</strong> 
                                        @if($tarea->fecha_limite)
                                            {{ \Carbon\Carbon::parse($tarea->fecha_limite)->format('d/m/Y H:i') }}
                                        @else
                                            Sin fecha
                                        @endif
                                    </div>
                                    
                                    <div class="task-info">
                                        <i class="fas fa-flag"></i>
                                        <strong>Prioridad:</strong> 
                                        <span class="priority-badge priority-{{ strtolower($tarea->prioridad ?? 'media') }}">
                                            {{ ucfirst($tarea->prioridad ?? 'media') }}
                                        </span>
                                    </div>
                                    
                                    <div class="task-info">
                                        <i class="fas fa-check-circle"></i>
                                        <strong>Estado:</strong> 
                                        <span class="status-badge status-{{ $tarea->completada ? 'completed' : 'pending' }}">
                                            {{ $tarea->completada ? 'Completada' : 'Pendiente' }}
                                        </span>
                                    </div>
                                    
                                    @if($tarea->archivo)
                                        <div class="task-info">
                                            <i class="fas fa-paperclip"></i>
                                            <strong>Archivo adjunto:</strong> 
                                            <a href="/storage/{{ $tarea->archivo }}" target="_blank" class="text-white">
                                                <u>Ver archivo</u>
                                            </a>
                                        </div>
                                    @endif
                                </div>
                            </div>
                        </div>
                    @endforeach
                </div>
            @else
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No hay tareas disponibles</h3>
                    <p class="text-muted">¡Comienza creando tu primera tarea!</p>
                </div>
            @endif
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html> 
