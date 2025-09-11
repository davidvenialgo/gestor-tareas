<?php

namespace App\Http\Controllers;

use App\Models\Tarea;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TareaController extends Controller
{
 
    public function index(Request $request)
    {
        try {
            Log::info('Usuario solicitando tareas: ' . $request->user()->id);
            
            // Obtener tareas propias del usuario
            $query = $request->user()->tareas();
            
            // Aplicar filtros si se proporcionan
            if ($request->has('filtro')) {
                $filtro = $request->get('filtro');
                Log::info('Aplicando filtro: ' . $filtro);
                if ($filtro === 'pendientes') {
                    $query->where('completada', false);
                } elseif ($filtro === 'completadas') {
                    $query->where('completada', true);
                }
            }
            
            // Aplicar búsqueda si se proporciona
            if ($request->has('buscar') && !empty($request->get('buscar'))) {
                $buscar = $request->get('buscar');
                Log::info('Aplicando búsqueda: ' . $buscar);
                $query->where(function($q) use ($buscar) {
                    $q->where('titulo', 'like', '%' . $buscar . '%')
                      ->orWhere('descripcion', 'like', '%' . $buscar . '%');
                });
            }
            
            // Obtener tareas compartidas por separado con información del usuario que las compartió
            $tareasCompartidas = $request->user()->tareasCompartidas()->with('user');
            
            // Aplicar los mismos filtros a las tareas compartidas
            if ($request->has('filtro')) {
                $filtro = $request->get('filtro');
                if ($filtro === 'pendientes') {
                    $tareasCompartidas->where('completada', false);
                } elseif ($filtro === 'completadas') {
                    $tareasCompartidas->where('completada', true);
                }
            }
            
            if ($request->has('buscar') && !empty($request->get('buscar'))) {
                $buscar = $request->get('buscar');
                $tareasCompartidas->where(function($q) use ($buscar) {
                    $q->where('titulo', 'like', '%' . $buscar . '%')
                      ->orWhere('descripcion', 'like', '%' . $buscar . '%');
                });
            }
            
            // Obtener tareas propias paginadas
            $tareasPropias = $query->orderBy('created_at', 'desc')->get();
            
            // Obtener tareas compartidas
            $tareasCompartidas = $tareasCompartidas->orderBy('created_at', 'desc')->get();
            
            // Marcar tareas propias
            $tareasPropias->each(function($tarea) {
                $tarea->es_propia = true;
            });
            
            // Marcar tareas compartidas y agregar información del usuario que las compartió
            $tareasCompartidas->each(function($tarea) {
                $tarea->es_propia = false;
                $tarea->usuario_compartio = $tarea->user ? $tarea->user->username : 'Usuario desconocido';
            });
            
            // Combinar las colecciones
            $todasLasTareas = $tareasPropias->concat($tareasCompartidas)->sortByDesc('created_at');
            
            // Aplicar paginación manual
            $perPage = 5;
            $currentPage = $request->get('page', 1);
            $offset = ($currentPage - 1) * $perPage;
            $tareasPaginadas = $todasLasTareas->slice($offset, $perPage);
            
            Log::info('Tareas encontradas: ' . $todasLasTareas->count());
            
            // Obtener conteos totales (solo de tareas propias)
            $totalTareas = $request->user()->tareas()->count();
            $totalCompletadas = $request->user()->tareas()->where('completada', true)->count();
            $totalPendientes = $request->user()->tareas()->where('completada', false)->count();
            
            Log::info('Conteos totales - Total: ' . $totalTareas . ', Completadas: ' . $totalCompletadas . ', Pendientes: ' . $totalPendientes);
            
            // Crear respuesta manual con los datos
            $response = [
                'current_page' => (int)$currentPage,
                'data' => $tareasPaginadas->values()->toArray(),
                'first_page_url' => url('/api/tareas?page=1'),
                'from' => $offset + 1,
                'last_page' => ceil($todasLasTareas->count() / $perPage),
                'last_page_url' => url('/api/tareas?page=' . ceil($todasLasTareas->count() / $perPage)),
                'next_page_url' => $currentPage < ceil($todasLasTareas->count() / $perPage) ? url('/api/tareas?page=' . ($currentPage + 1)) : null,
                'path' => url('/api/tareas'),
                'per_page' => $perPage,
                'prev_page_url' => $currentPage > 1 ? url('/api/tareas?page=' . ($currentPage - 1)) : null,
                'to' => min($offset + $perPage, $todasLasTareas->count()),
                'total' => $todasLasTareas->count(),
                'total_tareas' => $totalTareas,
                'total_completadas' => $totalCompletadas,
                'total_pendientes' => $totalPendientes
            ];
            
            return response()->json($response);
        } catch (\Exception $e) {
            Log::error('Error en index de tareas: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json(['error' => 'Error interno del servidor'], 500);
        }
    }

    public function store(Request $request)
    {
        $request->validate([
            'titulo' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'prioridad' => 'in:baja,media,alta',
            'fecha_limite' => 'nullable|date',
            'archivo' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,gif,bmp,webp|max:5120',
        ]);

        $datos = [
            'titulo' => $request->titulo,
            'descripcion' => $request->descripcion,
            'prioridad' => $request->prioridad ?? 'media',
            'fecha_limite' => $request->fecha_limite,
        ];

        if ($request->hasFile('archivo')){
            $datos['archivo'] = $request->file('archivo')->store('archivos', 'public');
        }

        $tarea = $request->user()->tareas()->create($datos);
        return response()->json($tarea, 201);
    }

    public function show(Request $request, Tarea $tarea)
    {
        Log::info('Obteniendo tarea ID: ' . $tarea->id . ' por usuario: ' . $request->user()->id);
        
        // Verificar que el usuario tenga acceso a esta tarea (propia o compartida)
        $usuario = $request->user();
        $tieneAcceso = $tarea->user_id === $usuario->id || 
                       $tarea->compartidosCon()->where('user_id', $usuario->id)->exists();
        
        if (!$tieneAcceso) {
            Log::warning('Usuario sin acceso a tarea: ' . $tarea->id);
            return response()->json(['message' => 'No tienes acceso a esta tarea'], 403);
        }
        
        Log::info('Tarea obtenida exitosamente:', $tarea->toArray());
        return response()->json($tarea, 200);
    }

    public function update(Request $request, Tarea $tarea)
    {
        Log::info('Actualizando tarea ID: ' . $tarea->id . ' por usuario: ' . $request->user()->id);
        Log::info('Datos recibidos en update:', $request->all());
        
        if($tarea->user_id !== $request->user()->id){
            Log::warning('Usuario sin permisos para actualizar tarea: ' . $tarea->id);
            return response()->json(['message' => 'No tienes permisos para actualizar esta tarea'], 403);
        }

        // Validación más simple y directa
        $request->validate([
            'titulo' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'prioridad' => 'nullable|in:baja,media,alta',
            'fecha_limite' => 'nullable|date',
            'completada' => 'nullable|boolean',
            'archivo' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,gif,bmp,webp|max:5120',
        ]);
        
        Log::info('Validación pasada exitosamente');

        // Actualizar todos los campos directamente
        $updateData = [
            'titulo' => $request->titulo,
            'descripcion' => $request->descripcion,
            'prioridad' => $request->prioridad,
            'fecha_limite' => $request->fecha_limite,
        ];
        
        // Solo agregar completada si se envía
        if ($request->has('completada')) {
            $updateData['completada'] = $request->completada;
        }

        // Solo actualizar archivo si se envía uno nuevo
        if ($request->hasFile('archivo')){
            $updateData['archivo'] = $request->file('archivo')->store('archivos', 'public');
        }

        Log::info('Datos a actualizar:', $updateData);
        
        // Verificar el estado antes de la actualización
        Log::info('Estado ANTES de la actualización:', $tarea->toArray());
        
        $resultado = $tarea->update($updateData);
        
        Log::info('Resultado de la actualización:', ['resultado' => $resultado]);
        
        // Refrescar el modelo para obtener los datos actualizados
        $tarea->refresh();
        
        Log::info('Estado DESPUÉS de la actualización:', $tarea->toArray());
        
        return response()->json($tarea, 200);
    }

    public function destroy(Request $request, Tarea $tarea)
    {
        $usuario = $request->user();
        
        // Si es el propietario de la tarea, eliminar completamente
        if($tarea->user_id === $usuario->id){
            $tarea->delete();
            return response()->json(['message' => 'Tarea eliminada correctamente'], 200);
        }
        
        // Si es una tarea compartida, solo desvincular al usuario
        if($tarea->compartidosCon()->where('user_id', $usuario->id)->exists()){
            $tarea->compartidosCon()->detach($usuario->id);
            return response()->json(['message' => 'Tarea removida de tu bandeja'], 200);
        }
        
        return response()->json(['message' => 'No tienes permisos para eliminar esta tarea'], 403);
    }

    public function compartir(Request $request, Tarea $tarea)
    {
        $request->validate([
            'username' => 'required|exists:users,username',
        ]);

        $usuario = User::where('username', $request->username)->first();
        if($tarea->user_id !== $request->user()->id){
            return response()->json(['message' => 'No tienes permisos para compartir esta tarea'], 403);
        }

        $tarea->compartidosCon()->syncWithoutDetaching($usuario->id);
        return response()->json(['message' => 'Tarea compartida correctamente'], 200);
    }

    public function todasLasTareas(Request $request)
    {
        // Verificar permisos para ver reportes
        if (!$request->user()->can_view_reports) {
            return response()->json(['message' => 'No tienes permisos para acceder a esta funcionalidad'], 403);
        }

        try {
            // Obtener todas las tareas con información del usuario
            $tareas = Tarea::with('user')
                          ->orderBy('created_at', 'desc')
                          ->get()
                          ->map(function($tarea) {
                              return [
                                  'id' => $tarea->id,
                                  'titulo' => $tarea->titulo,
                                  'descripcion' => $tarea->descripcion,
                                  'completada' => $tarea->completada,
                                  'prioridad' => $tarea->prioridad,
                                  'fecha_limite' => $tarea->fecha_limite,
                                  'created_at' => $tarea->created_at,
                                  'updated_at' => $tarea->updated_at,
                                  'user_id' => $tarea->user_id,
                                  'user_name' => $tarea->user ? $tarea->user->name : 'Usuario desconocido',
                                  'user_username' => $tarea->user ? $tarea->user->username : 'N/A'
                              ];
                          });

            return response()->json($tareas, 200);
        } catch (\Exception $e) {
            Log::error('Error al obtener todas las tareas: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener las tareas'], 500);
        }
    }

    /**
     * Método para mostrar la vista web de tareas (sin autenticación)
     */
    public function webIndex()
    {
        // Obtener algunas tareas de ejemplo para mostrar
        $tareas = Tarea::orderBy('created_at', 'desc')->limit(10)->get();
        
        return view('tareas.index', compact('tareas'));
    }
}
