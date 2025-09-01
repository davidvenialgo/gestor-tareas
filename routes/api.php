<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TareaController;
use App\Http\Controllers\AuthController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::middleware(['auth:sanctum', 'check.user.status'])->get('/user', function (Request $request) {
    return $request->user();
});

Route::post('register', [AuthController::class, 'register']);
Route::post('login', [AuthController::class, 'login']);

Route::middleware(['auth:sanctum', 'check.user.status'])->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);

    Route::get('tareas', [TareaController::class, 'index']);
    Route::post('tareas', [TareaController::class, 'store']);
    Route::get('tareas/{tarea}', [TareaController::class, 'show']);
    Route::delete('tareas/{tarea}', [TareaController::class, 'destroy']);
    Route::get('tareas-todas', [TareaController::class, 'todasLasTareas']);
    
    Route::get('usuarios', [AuthController::class, 'obtenerUsuarios']);
});

// Ruta de actualización usando POST para evitar problemas de redirección
Route::middleware(['auth:sanctum', 'check.user.status'])->post('tareas/{tarea}/update', [TareaController::class, 'update']);

Route::middleware(['auth:sanctum', 'check.user.status'])->put('usuario', [AuthController::class, 'actualizarPerfil']);

Route::middleware(['auth:sanctum', 'check.user.status'])->post('tareas/{tarea}/compartir', [TareaController::class, 'compartir']);