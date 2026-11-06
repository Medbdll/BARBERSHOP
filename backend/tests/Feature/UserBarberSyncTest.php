<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Barber;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserBarberSyncTest extends TestCase
{
    use DatabaseTransactions;

    protected User $admin;
    protected Service $service;

    protected function setUp(): void
    {
        parent::setUp();

        // Ensure roles exist
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'sanctum']);
        Role::firstOrCreate(['name' => 'employe', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'employe', 'guard_name' => 'sanctum']);
        Role::firstOrCreate(['name' => 'client', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'client', 'guard_name' => 'sanctum']);

        $uid = uniqid();
        $this->admin = User::create([
            'name' => 'Admin Sync Tester',
            'email' => "admin.sync_{$uid}@barbershop.ma",
            'password' => Hash::make('password123'),
        ]);
        $this->admin->assignRole('admin');

        $this->service = Service::firstOrCreate(
            ['name' => 'Coupe Signature Sync'],
            [
                'category' => 'hair',
                'duration' => 45,
                'price' => 180.00,
                'description' => 'Service test for sync',
                'is_active' => true,
            ]
        );

        Cache::flush();
    }

    public function test_assigning_employee_role_creates_barber_profile_and_working_hours(): void
    {
        $uid = uniqid();
        $user = User::create([
            'name' => 'Samir Barber',
            'email' => "samir_{$uid}@barbershop.ma",
            'password' => Hash::make('password123'),
        ]);

        $this->assertDatabaseMissing('barbers', [
            'user_id' => $user->id,
        ]);

        // Assign employee role
        $user->assignRole('employe');

        // Check barber was created
        $this->assertDatabaseHas('barbers', [
            'user_id' => $user->id,
            'name' => 'Samir Barber',
            'is_active' => true,
            'deleted_at' => null,
        ]);

        $barber = Barber::where('user_id', $user->id)->first();
        $this->assertNotNull($barber);
        $this->assertCount(7, $barber->workingHours);
    }

    public function test_updating_user_name_updates_barber_name(): void
    {
        $uid = uniqid();
        $user = User::create([
            'name' => 'Tariq OldName',
            'email' => "tariq_{$uid}@barbershop.ma",
            'password' => Hash::make('password123'),
        ]);
        $user->assignRole('employe');

        $user->update(['name' => 'Tariq NewName']);

        $this->assertDatabaseHas('barbers', [
            'user_id' => $user->id,
            'name' => 'Tariq NewName',
        ]);
    }

    public function test_changing_role_from_employee_to_client_with_appointments_soft_deletes_barber(): void
    {
        $uid = uniqid();
        $employeeUser = User::create([
            'name' => 'Hamza Barber',
            'email' => "hamza_{$uid}@barbershop.ma",
            'password' => Hash::make('password123'),
        ]);
        $employeeUser->assignRole('employe');

        $barber = Barber::where('user_id', $employeeUser->id)->first();
        $this->assertNotNull($barber);

        $clientUser = User::create([
            'name' => 'Client Appt Tester',
            'email' => "client_{$uid}@test.ma",
            'password' => Hash::make('password123'),
        ]);

        // Attach an appointment to the barber
        $appointment = Appointment::create([
            'client_id' => $clientUser->id,
            'barber_id' => $barber->id,
            'service_id' => $this->service->id,
            'appointment_date' => Carbon::tomorrow()->toDateString(),
            'start_time' => '10:00:00',
            'end_time' => '10:45:00',
            'status' => 'confirmed',
            'total_price' => 180.00,
        ]);

        // Change role from employe to client
        $employeeUser->syncRoles(['client']);

        // Barber should be soft-deleted and inactive to protect appointment foreign key
        $this->assertDatabaseHas('barbers', [
            'id' => $barber->id,
            'user_id' => $employeeUser->id,
            'is_active' => false,
        ]);
        $this->assertSoftDeleted('barbers', ['id' => $barber->id]);

        // The appointment should still exist intact!
        $this->assertDatabaseHas('appointments', ['id' => $appointment->id]);
    }

    public function test_re_assigning_employee_role_restores_soft_deleted_barber(): void
    {
        $uid = uniqid();
        $user = User::create([
            'name' => 'Rachid Restorable',
            'email' => "rachid_{$uid}@barbershop.ma",
            'password' => Hash::make('password123'),
        ]);
        $user->assignRole('employe');

        $barber = Barber::where('user_id', $user->id)->first();

        // Create an appointment so soft delete is triggered
        Appointment::create([
            'client_id' => $this->admin->id,
            'barber_id' => $barber->id,
            'service_id' => $this->service->id,
            'appointment_date' => Carbon::tomorrow()->toDateString(),
            'start_time' => '11:00:00',
            'end_time' => '11:45:00',
            'status' => 'confirmed',
            'total_price' => 180.00,
        ]);

        // Demote user
        $user->syncRoles(['client']);
        $this->assertTrue($barber->fresh()->trashed());
        $this->assertFalse($barber->fresh()->is_active);

        // Re-assign employe role
        $user->syncRoles(['employe']);

        $restoredBarber = Barber::where('user_id', $user->id)->first();
        $this->assertNotNull($restoredBarber);
        $this->assertFalse($restoredBarber->trashed());
        $this->assertTrue($restoredBarber->is_active);
    }

    public function test_get_barbers_api_only_returns_active_employees(): void
    {
        $uid = uniqid();
        $activeEmployee = User::create([
            'name' => "Active Barber {$uid}",
            'email' => "active_{$uid}@barbershop.ma",
            'password' => Hash::make('password123'),
        ]);
        $activeEmployee->assignRole('employe');

        $response = $this->getJson('/api/barbers');
        $response->assertStatus(200);

        $barberNames = collect($response->json('data'))->pluck('name');
        $this->assertTrue($barberNames->contains("Active Barber {$uid}"));

        // Demote employee to client
        $activeEmployee->syncRoles(['client']);

        // Call API again (cache should be invalidated)
        $response2 = $this->getJson('/api/barbers');
        $response2->assertStatus(200);

        $updatedBarberNames = collect($response2->json('data'))->pluck('name');
        $this->assertFalse($updatedBarberNames->contains("Active Barber {$uid}"));
    }

    public function test_admin_api_user_creation_and_role_sync_synchronizes_barber(): void
    {
        $uid = uniqid();

        // 1. Admin creates user with role employe
        $createResponse = $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/users', [
            'name' => "Admin Created Barber {$uid}",
            'email' => "admin_barber_{$uid}@barbershop.ma",
            'phone' => '+212 6 77 88 99 00',
            'role' => 'employe',
            'password' => 'secret12345',
        ]);

        $createResponse->assertStatus(201);
        $createdUserId = $createResponse->json('data.id');

        $this->assertDatabaseHas('barbers', [
            'user_id' => $createdUserId,
            'name' => "Admin Created Barber {$uid}",
            'is_active' => true,
        ]);

        // 2. Admin syncs user's roles to client
        $syncResponse = $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/users/{$createdUserId}/sync-roles", [
            'roles' => ['client'],
        ]);

        $syncResponse->assertStatus(200);

        // Without appointments, barber profile is cleaned up or inactive
        $barber = Barber::where('user_id', $createdUserId)->first();
        $this->assertNull($barber);
    }
}
