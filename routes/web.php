<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TareaController;

/*|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function() {
    return '¡Hola! Esta es la página principal de tu sistema de tareas.';
})->name('home');

// Ruta de prueba para verificar que el controlador funciona
Route::get('/test', function() {
    return '¡Hola! El controlador funciona correctamente.';
});

// Ruta de login para evitar errores de redirección
Route::get('/login', function () {
    return response()->json(['message' => 'Unauthorized - Please login via API'], 401);
})->name('login');

// Ruta para servir archivos de storage
Route::get('/storage/{path}', function ($path) {
    $filePath = storage_path('app/public/' . $path);
    
    if (!file_exists($filePath)) {
        abort(404);
    }
    
    return response()->file($filePath);
})->where('path', '.*');

Route::post('/logout', [\App\Http\Controllers\AuthController::class, 'logout'])->name('logout');

