<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Tarea extends Model
{
    
    protected $fillable = ['titulo', 'descripcion', 'completada', 'user_id', 'prioridad', 'fecha_limite', 'archivo'];

    protected $casts = [
        'completada' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function compartidosCon()
    {
        return $this->belongsToMany(User::class, 'tarea_user');
    }
}
