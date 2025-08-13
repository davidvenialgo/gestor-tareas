<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;

class AssignUserPermissions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'users:assign-permissions {user_id} {--permission=can_view_users} {--reports}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Asignar permisos a un usuario específico';

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
        $userId = $this->argument('user_id');
        $permission = $this->option('permission');
        $reports = $this->option('reports');

        try {
            $user = User::findOrFail($userId);
            
            if ($permission === 'can_view_users') {
                $user->can_view_users = true;
                $this->info("✅ Permiso 'can_view_users' asignado exitosamente al usuario: {$user->name} (ID: {$user->id})");
            }
            
            if ($reports) {
                $user->can_view_reports = true;
                $this->info("✅ Permiso 'can_view_reports' asignado exitosamente al usuario: {$user->name} (ID: {$user->id})");
            }
            
            if (!$permission && !$reports) {
                $this->error("❌ Debes especificar al menos un permiso (--permission=can_view_users o --reports)");
                return 1;
            }
            
            $user->save();
            return 0;
        } catch (\Exception $e) {
            $this->error("❌ Error: " . $e->getMessage());
            return 1;
        }
    }
}
