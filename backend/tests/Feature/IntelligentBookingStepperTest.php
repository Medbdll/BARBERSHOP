<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Barber;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class IntelligentBookingStepperTest extends TestCase
{
    use DatabaseTransactions;

    protected User $client;
    protected Barber $barber;
    protected Service $service1;
    protected Service $service2;

    protected function setUp(): void
    {
        parent::setUp();

        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'client', 'guard_name' => 'web']);
        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'client', 'guard_name' => 'sanctum']);

        $this->client = User::create([
            'name' => 'VIP Test Client',
            'email' => 'viptest_' . uniqid() . '@barberoza.com',
            'phone' => null, // Initially null to test phone requirement
            'password' => bcrypt('password123'),
            'loyalty_points' => 50,
        ]);
        $this->client->assignRole('client');

        $this->barber = Barber::where('is_active', true)->first() ?? Barber::create([
            'name' => 'Maître Barber Test',
            'specialty' => 'Coupe & Barbe',
            'rating' => 4.9,
            'is_active' => true,
        ]);

        if ($this->barber->workingHours()->count() === 0) {
            for ($d = 0; $d <= 6; $d++) {
                $this->barber->workingHours()->create([
                    'day_of_week' => $d,
                    'start_time' => '09:00:00',
                    'end_time' => '20:00:00',
                    'is_day_off' => false,
                ]);
            }
        }

        $this->service1 = Service::create([
            'name' => 'Coupe Signature ' . uniqid(),
            'category' => 'hair',
            'duration' => 30,
            'price' => 150,
            'is_active' => true,
        ]);

        $this->service2 = Service::create([
            'name' => 'Taille de Barbe ' . uniqid(),
            'category' => 'beard',
            'duration' => 20,
            'price' => 100,
            'is_active' => true,
        ]);
    }

    /**
     * Test 1: GET /api/barbers?date=YYYY-MM-DD returns live queue counters.
     */
    public function test_barbers_endpoint_returns_live_queue_counters(): void
    {
        $testDate = Carbon::now()->addDays(3)->format('Y-m-d');

        // Check initial queue count
        $response = $this->getJson("/api/barbers?date={$testDate}");
        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'waiting_clients_count',
                        'estimated_wait_minutes',
                        'waiting_badge',
                    ]
                ],
                'date',
            ]);

        $initialBarberData = collect($response->json('data'))->firstWhere('id', $this->barber->id);
        $initialCount = $initialBarberData['waiting_clients_count'];

        // Create an appointment for this barber on that date
        Appointment::create([
            'client_id' => $this->client->id,
            'barber_id' => $this->barber->id,
            'service_id' => $this->service1->id,
            'appointment_date' => $testDate,
            'start_time' => '10:00:00',
            'end_time' => '10:30:00',
            'status' => 'confirmed',
            'total_price' => 150,
        ]);

        // Re-query barbers for that date
        $responseAfter = $this->getJson("/api/barbers?date={$testDate}");
        $responseAfter->assertStatus(200);

        $updatedBarberData = collect($responseAfter->json('data'))->firstWhere('id', $this->barber->id);
        $this->assertEquals($initialCount + 1, $updatedBarberData['waiting_clients_count']);
        $this->assertGreaterThanOrEqual(30, $updatedBarberData['estimated_wait_minutes']);
    }

    /**
     * Test 2: Phone is required when user has no phone, and persists permanently upon booking.
     */
    public function test_phone_is_required_if_user_phone_is_null_and_persists_permanently(): void
    {
        Sanctum::actingAs($this->client, ['*']);
        $testDate = Carbon::now()->addDays(4)->format('Y-m-d');

        // 1. Attempt booking without phone when user.phone is null -> MUST fail with 422
        $failResponse = $this->postJson('/api/appointments', [
            'service_id' => $this->service1->id,
            'barber_id' => $this->barber->id,
            'appointment_date' => $testDate,
            'start_time' => '11:00',
            'phone' => null,
        ]);

        $failResponse->assertStatus(422)
            ->assertJsonValidationErrors(['phone']);

        // 2. Submit booking with phone -> MUST succeed (201) and save phone to users table
        $successResponse = $this->postJson('/api/appointments', [
            'service_id' => $this->service1->id,
            'barber_id' => $this->barber->id,
            'appointment_date' => $testDate,
            'start_time' => '11:00',
            'phone' => '+212612345678',
            'notes' => 'Dégradé américain',
        ]);

        $successResponse->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'user' => [
                    'phone' => '+212612345678',
                ],
            ]);

        // Verify users table in DB was permanently updated
        $this->client->refresh();
        $this->assertEquals('+212612345678', $this->client->phone);

        // 3. Subsequent booking WITHOUT phone -> MUST succeed because user.phone is now saved in profile
        $secondBookingResponse = $this->postJson('/api/appointments', [
            'service_id' => $this->service2->id,
            'barber_id' => $this->barber->id,
            'appointment_date' => $testDate,
            'start_time' => '15:00',
            // No phone passed here
        ]);

        $secondBookingResponse->assertStatus(201)
            ->assertJson([
                'status' => 'success',
            ]);
    }

    /**
     * Test 3: Multi-service booking calculates combined duration and price.
     */
    public function test_multi_service_booking_calculates_total_duration_and_price(): void
    {
        $this->client->update(['phone' => '+212699887766']);
        Sanctum::actingAs($this->client, ['*']);
        $testDate = Carbon::now()->addDays(5)->format('Y-m-d');

        $response = $this->postJson('/api/appointments', [
            'service_ids' => [$this->service1->id, $this->service2->id],
            'barber_id' => $this->barber->id,
            'appointment_date' => $testDate,
            'start_time' => '14:00',
        ]);

        $response->assertStatus(201);
        $apptData = $response->json('data');

        // Total price = 150 + 100 = 250
        $this->assertEquals(250, (float) $apptData['total_price']);

        // Total duration = 30 + 20 = 50 minutes (14:00 to 14:50)
        $this->assertEquals('14:00', $apptData['start_time']);
        $this->assertEquals('14:50', $apptData['end_time']);
    }

    /**
     * Test 4: Double-booking prevention rejects overlapping appointment for the same barber.
     */
    public function test_double_booking_prevention_rejects_overlapping_slot(): void
    {
        $this->client->update(['phone' => '+212699887766']);
        Sanctum::actingAs($this->client, ['*']);
        $testDate = Carbon::now()->addDays(6)->format('Y-m-d');

        // Book slot 10:00 to 10:30
        $first = $this->postJson('/api/appointments', [
            'service_id' => $this->service1->id, // 30 min
            'barber_id' => $this->barber->id,
            'appointment_date' => $testDate,
            'start_time' => '10:00',
        ]);
        $first->assertStatus(201);

        // Attempt exact same slot -> MUST fail with 422
        $conflict1 = $this->postJson('/api/appointments', [
            'service_id' => $this->service1->id,
            'barber_id' => $this->barber->id,
            'appointment_date' => $testDate,
            'start_time' => '10:00',
        ]);
        $conflict1->assertStatus(422)
            ->assertJsonValidationErrors(['start_time']);

        // Attempt overlapping slot inside the window (e.g. 10:15) -> MUST fail with 422
        $conflict2 = $this->postJson('/api/appointments', [
            'service_id' => $this->service1->id,
            'barber_id' => $this->barber->id,
            'appointment_date' => $testDate,
            'start_time' => '10:15',
        ]);
        $conflict2->assertStatus(422)
            ->assertJsonValidationErrors(['start_time']);
    }
}
