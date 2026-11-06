<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Barber;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ClientDashboardFlowTest extends TestCase
{
    use DatabaseTransactions;

    protected User $client;
    protected User $otherClient;
    protected Barber $barber;
    protected Service $service;

    protected function setUp(): void
    {
        parent::setUp();

        // Ensure role exists
        Role::firstOrCreate(['name' => 'client', 'guard_name' => 'web']);

        $uid = uniqid();

        // Create main client
        $this->client = User::factory()->create([
            'name' => 'Jean Dupont VIP',
            'email' => "client_{$uid}@test.com",
            'loyalty_points' => 120,
        ]);
        $this->client->assignRole('client');

        // Create secondary client to test isolation
        $this->otherClient = User::factory()->create([
            'name' => 'Autre Client',
            'email' => "other_{$uid}@test.com",
        ]);
        $this->otherClient->assignRole('client');

        // Create Barber
        $this->barber = Barber::create([
            'name' => 'Yassine El Fassi',
            'specialty' => 'Coupes Classiques & Ciseaux',
            'experience' => '10 ans',
            'rating' => 5.0,
            'bio' => 'Maître barbier',
            'is_active' => true,
        ]);

        // Create Service
        $this->service = Service::create([
            'name' => 'Coupe Signature Royale',
            'category' => 'hair',
            'duration' => 35,
            'price' => 150.00,
            'description' => 'Coupe de prestige',
            'is_active' => true,
        ]);
    }

    /**
     * Test GET /api/client/appointments returns strictly scoped appointments and summary stats.
     */
    public function test_get_client_appointments_is_scoped_and_separated_with_stats(): void
    {
        Sanctum::actingAs($this->client);

        $tomorrow = Carbon::tomorrow()->toDateString();
        $pastDate = Carbon::yesterday()->toDateString();

        // 1. Upcoming appointment for this client
        $upcomingAppt = Appointment::create([
            'client_id' => $this->client->id,
            'barber_id' => $this->barber->id,
            'service_id' => $this->service->id,
            'appointment_date' => $tomorrow,
            'start_time' => '14:00:00',
            'end_time' => '14:35:00',
            'status' => 'confirmed',
            'total_price' => 150.00,
        ]);

        // 2. Past completed appointment for this client
        $historyAppt = Appointment::create([
            'client_id' => $this->client->id,
            'barber_id' => $this->barber->id,
            'service_id' => $this->service->id,
            'appointment_date' => $pastDate,
            'start_time' => '10:00:00',
            'end_time' => '10:35:00',
            'status' => 'completed',
            'total_price' => 150.00,
        ]);

        // 3. Appointment belonging to another client (MUST NOT be returned)
        Appointment::create([
            'client_id' => $this->otherClient->id,
            'barber_id' => $this->barber->id,
            'service_id' => $this->service->id,
            'appointment_date' => $tomorrow,
            'start_time' => '16:00:00',
            'end_time' => '16:35:00',
            'status' => 'confirmed',
            'total_price' => 150.00,
        ]);

        $response = $this->getJson('/api/client/appointments');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'summary_stats' => [
                    'total_completed_visits' => 1,
                    'upcoming_count' => 1,
                    'loyalty_points' => 120,
                ],
            ]);

        $data = $response->json('data');

        // Verify Upcoming separation and scoping
        $this->assertCount(1, $data['upcoming']);
        $this->assertEquals($upcomingAppt->id, $data['upcoming'][0]['id']);

        // Verify History separation
        $this->assertCount(1, $data['history']);
        $this->assertEquals($historyAppt->id, $data['history'][0]['id']);

        // Verify next_appointment in summary stats
        $this->assertEquals($upcomingAppt->id, $response->json('summary_stats.next_appointment.id'));
    }

    /**
     * Test PATCH /api/client/appointments/{id}/cancel allows cancelling future appointment.
     */
    public function test_client_can_cancel_future_appointment(): void
    {
        Sanctum::actingAs($this->client);

        $futureDate = Carbon::now()->addDays(2)->toDateString();

        $appointment = Appointment::create([
            'client_id' => $this->client->id,
            'barber_id' => $this->barber->id,
            'service_id' => $this->service->id,
            'appointment_date' => $futureDate,
            'start_time' => '15:00:00',
            'end_time' => '15:35:00',
            'status' => 'confirmed',
            'total_price' => 150.00,
        ]);

        $response = $this->patchJson("/api/client/appointments/{$appointment->id}/cancel");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'id' => $appointment->id,
                    'status' => 'cancelled',
                ],
            ]);

        $this->assertDatabaseHas('appointments', [
            'id' => $appointment->id,
            'status' => 'cancelled',
        ]);
    }

    /**
     * Test cancellation fails if appointment is currently in_progress.
     */
    public function test_cancellation_fails_if_in_progress(): void
    {
        Sanctum::actingAs($this->client);

        $appointment = Appointment::create([
            'client_id' => $this->client->id,
            'barber_id' => $this->barber->id,
            'service_id' => $this->service->id,
            'appointment_date' => Carbon::today()->toDateString(),
            'start_time' => Carbon::now()->addMinutes(10)->format('H:i:s'),
            'end_time' => Carbon::now()->addMinutes(45)->format('H:i:s'),
            'status' => 'in_progress', // Barber is currently cutting!
            'total_price' => 150.00,
        ]);

        $response = $this->patchJson("/api/client/appointments/{$appointment->id}/cancel");

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
            ]);
    }

    /**
     * Test cancellation fails if appointment is in the past.
     */
    public function test_cancellation_fails_if_in_the_past(): void
    {
        Sanctum::actingAs($this->client);

        $yesterday = Carbon::yesterday()->toDateString();

        $appointment = Appointment::create([
            'client_id' => $this->client->id,
            'barber_id' => $this->barber->id,
            'service_id' => $this->service->id,
            'appointment_date' => $yesterday,
            'start_time' => '10:00:00',
            'end_time' => '10:35:00',
            'status' => 'confirmed',
            'total_price' => 150.00,
        ]);

        $response = $this->patchJson("/api/client/appointments/{$appointment->id}/cancel");

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
            ]);
    }

    /**
     * Test client cannot cancel someone else's appointment.
     */
    public function test_client_cannot_cancel_other_clients_appointment(): void
    {
        Sanctum::actingAs($this->client);

        $otherAppointment = Appointment::create([
            'client_id' => $this->otherClient->id,
            'barber_id' => $this->barber->id,
            'service_id' => $this->service->id,
            'appointment_date' => Carbon::tomorrow()->toDateString(),
            'start_time' => '11:00:00',
            'end_time' => '11:35:00',
            'status' => 'confirmed',
            'total_price' => 150.00,
        ]);

        $response = $this->patchJson("/api/client/appointments/{$otherAppointment->id}/cancel");

        $response->assertStatus(404);
    }
}
