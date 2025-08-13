<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users',
            'password' => 'required|string|min:8',
            'email' => 'nullable|email|max:255|unique:users',
        ]);

        $userData = [
            'name' => $request->name,
            'username' => $request->username,
            'password' => bcrypt($request->password),
            'email' => $request->email ?? $request->username . '@example.com', // Valor por defecto temporal
            'status' => 'activo',
        ];

        $user = User::create($userData);

        return response()->json($user, 201);
    }

    public function login(Request $request)
    {
        Log::info($request->all());
        if (!Auth::attempt($request->only('username', 'password'))) {
            return response()->json(['message' => 'Credenciales inválidas'], 401);
        }

        $user = Auth::user();
        
        // Verificar si el usuario está activo
        if ($user->status !== 'activo') {
            Auth::logout();
            return response()->json(['message' => 'Tu cuenta está inactiva. Contacta al administrador.'], 403);
        }
        
        $token = $user->createToken('api_token')->plainTextToken; 

        // Asegurar que los campos de permisos estén incluidos en la respuesta
        $userData = $user->toArray();
        $userData['can_view_users'] = $user->can_view_users ?? false;
        $userData['can_view_reports'] = $user->can_view_reports ?? false;

        return response()->json(['token' => $token, 'user' => $userData], 200);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sesión Cerrada'], 200);
    }

    public function actualizarPerfil(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'nullable|string|max:255|unique:users,username,' . $request->user_id,
            'email' => 'nullable|email|max:255|unique:users,email,' . $request->user_id,
            'password' => 'nullable|string|min:8',
            'status' => 'nullable|in:activo,inactivo',
            'can_view_users' => 'nullable|boolean',
            'can_view_reports' => 'nullable|boolean',
            'user_id' => 'required|integer|exists:users,id',
        ]);

        // Buscar el usuario por ID
        $user = User::findOrFail($request->user_id);

        $user->name = $request->name;
        
        if ($request->filled('username')) {
            $user->username = $request->username;
        }

        if ($request->filled('email')) {
            $user->email = $request->email;
        }

        if ($request->filled('password')) {
            $user->password = bcrypt($request->password);
        }

        if ($request->filled('status')) {
            $user->status = $request->status;
        }

        if ($request->has('can_view_users')) {
            $user->can_view_users = $request->can_view_users;
        }

        if ($request->has('can_view_reports')) {
            $user->can_view_reports = $request->can_view_reports;
        }

        $user->save();

        return response()->json(['message' => 'Perfil actualizado correctamente', 'user' => $user], 200);
    }

    public function obtenerUsuarios(Request $request)
    {
        // Verificar permisos para acceder a la gestión de usuarios o reportes
        if (!$request->user()->can_view_users && !$request->user()->can_view_reports) {
            return response()->json(['message' => 'No tienes permisos para acceder a esta funcionalidad'], 403);
        }

        try {
            // Obtener todos los usuarios con información básica
            $usuarios = User::select('id', 'name', 'username', 'email', 'status', 'can_view_users', 'can_view_reports', 'created_at')
                           ->orderBy('name', 'asc')
                           ->get();

            return response()->json($usuarios, 200);
        } catch (\Exception $e) {
            Log::error('Error al obtener usuarios: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener usuarios'], 500);
        }
    }
}
