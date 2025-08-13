<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;

class ListUserPermissions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'users:list-permissions';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Listar todos los usuarios y sus permisos';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $users = User::select('id', 'name', 'username', 'email', 'status', 'can_view_users', 'can_view_reports', 'created_at')
                    ->orderBy('name', 'asc')
                    ->get();

        if ($users->isEmpty()) {
            $this->info('No hay usuarios registrados.');
            return 0;
        }

        $this->info('📋 Lista de usuarios y sus permisos:');
        $this->line('');

        $headers = ['ID', 'Nombre', 'Username', 'Email', 'Estado', 'Ver Usuarios', 'Ver Reportes', 'Fecha Registro'];
        $rows = [];

        foreach ($users as $user) {
            $rows[] = [
                $user->id,
                $user->name,
                $user->username,
                $user->email,
                $user->status,
                $user->can_view_users ? '✅ Sí' : '❌ No',
                $user->can_view_reports ? '✅ Sí' : '❌ No',
                $user->created_at->format('d/m/Y H:i')
            ];
        }

        $this->table($headers, $rows);
        
        $this->line('');
        $this->info('💡 Para asignar permisos usa:');
        $this->line('   php artisan users:assign-permissions {user_id} --permission=can_view_users');
        $this->line('   php artisan users:assign-permissions {user_id} --reports');
        $this->line('   php artisan users:assign-permissions {user_id} --permission=can_view_users --reports');
        
        return 0;
    }
}
