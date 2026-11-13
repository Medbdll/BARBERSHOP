<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleAndPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Sets up Spatie roles, permissions, and initial accounts.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Define Permissions for both web and sanctum guards
        $adminPermissions = [
            'manage users',
            'manage roles',
            'manage services',
            'manage barbers',
            'manage all appointments',
            'view analytics',
            'moderate reviews',
            'export reports',
        ];

        $employePermissions = [
            'view own schedule',
            'update own appointment status',
            'manage own working hours',
            'view assigned clients',
        ];

        $clientPermissions = [
            'book appointment',
            'cancel own appointment',
            'reschedule own appointment',
            'leave review',
            'view loyalty points',
        ];

        $allPermissions = array_unique(array_merge($adminPermissions, $employePermissions, $clientPermissions));

        $guards = ['web', 'sanctum'];

        foreach ($guards as $guard) {
            foreach ($allPermissions as $perm) {
                Permission::firstOrCreate(['name' => $perm, 'guard_name' => $guard]);
            }

            // Roles
            $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => $guard]);
            $adminRole->syncPermissions(Permission::where('guard_name', $guard)->get());

            $employeRole = Role::firstOrCreate(['name' => 'employe', 'guard_name' => $guard]);
            $employeRole->syncPermissions(
                Permission::whereIn('name', $employePermissions)->where('guard_name', $guard)->get()
            );

            $clientRole = Role::firstOrCreate(['name' => 'client', 'guard_name' => $guard]);
            $clientRole->syncPermissions(
                Permission::whereIn('name', $clientPermissions)->where('guard_name', $guard)->get()
            );
        }

        // 2. Seed Default Accounts with Roles
        // Admin
        $admin = User::firstOrCreate(
            ['email' => 'admin@barbershop.ma'],
            [
                'name' => 'Directeur Général VIP',
                'phone' => '+212 6 00 00 00 01',
                'password' => Hash::make('password123'),
                'loyalty_points' => 999,
            ]
        );
        $admin->syncRoles(['admin']);

        // Employé
        $employe = User::firstOrCreate(
            ['email' => 'employe@barbershop.ma'],
            [
                'name' => 'Employé Barbier',
                'phone' => '+212 6 11 22 33 44',
                'password' => Hash::make('password123'),
                'loyalty_points' => 100,
            ]
        );
        $employe->syncRoles(['employe']);

        // Client
        $client = User::firstOrCreate(
            ['email' => 'client@barbershop.ma'],
            [
                'name' => 'Client VIP',
                'phone' => '+212 6 99 88 77 66',
                'password' => Hash::make('password123'),
                'loyalty_points' => 180,
            ]
        );
        $client->syncRoles(['client']);
    }
}
