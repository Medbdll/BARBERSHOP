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

class BarbershopAppointmentFlowTest extends TestCase
{
    use DatabaseTransactions;

    protected User $client;
    protected Barber $barber;
    protected Service $service;

    protected function setUp(): void
    {
        parent::setUp();

        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'client', 'guard_name' => 'web']);
        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'client', 'guard_name' => 'sanctum']);

        // Retrieve existing seeded test models or create fallbacks
        $this->client = User::role('client')->first() ?? User::factory()->create();
        if (! $this->client->hasRole('client')) {
            $this->client->assignRole('client');
        }

        $this->barber = Barber::where('is_active', true)->first() ?? Barber::create([
            'name' => 'Maître Testeur',
            'specialty' => 'Coupe & Barbe',
            'rating' => 4.9,
            'is_active' => true,
        ]);

        if ($this->barber->workingHours()->count() === 0) {
            for ($d = 0; $d <= 6; $d++) {
                $this->barber->workingHours()->create([
                    'day_of_week' => $d,
                    'start_time' => '09:00:00',
                    'end_time' => '19:00:00',
                    'break_start' => '13:00:00',
                    'break_end' => '14:00:00',
                    'is_day_off' => false,
                ]);
            }
        }

        $this->service = Service::where('is_active', true)->first() ?? Service::create([
            'name' => 'Coupe Signature Test',
            'category' => 'hair',
            'duration' => 30,
            'price' => 150,
            'currency' => 'MAD',
            'is_active' => true,
        ]);
    }

    /**
     * a) Booking a past date/time fails with a 422 validation error.
     */
    public function test_booking_past_datetime_fails_with_422_validation_error(): void
    {
        Sanctum::actingAs($this->client, ['*']);

        // Sub-test 1: Yesterday's date
        $yesterdayResponse = $this->postJson('/api/appointments', [
            'service_id' => $this->service->id,
            'barber_id' => $this->barber->id,
            'appointment_date' => Carbon::yesterday()->format('Y-m-d'),
            'start_time' => '10:00',
            'client_phone' => '+212600112233',
        ]);

        $yesterdayResponse->assertStatus(422)
            ->assertJsonValidationErrors(['appointment_date', 'appointment_datetime']);

        // Sub-test 2: Today with an earlier time (e.g. 05:00 AM)
        $pastTimeTodayResponse = $this->postJson('/api/appointments', [
            'service_id' => $this->service->id,
            'barber_id' => $this->barber->id,
            'appointment_date' => Carbon::today()->format('Y-m-d'),
            'start_time' => '05:00',
            'client_phone' => '+212600112233',
        ]);

        $pastTimeTodayResponse->assertStatus(422)
            ->assertJsonValidationErrors(['appointment_datetime']);
    }

    /**
     * c) Booking a valid future slot succeeds and removes that slot from the available list.
     */
    public function test_booking_valid_future_slot_succeeds_and_removes_it_from_available_list(): void
    {
        Sanctum::actingAs($this->client, ['*']);

        // Choose a future date (2 days from now)
        $futureDate = Carbon::now()->addDays(2)->format('Y-m-d');

        // Step 1: Query available slots before booking
        $initialSlotsResponse = $this->getJson("/api/available-slots?date={$futureDate}&barber_id={$this->barber->id}&duration={$this->service->duration}");
        $initialSlotsResponse->assertStatus(200);

        $slotsBefore = $initialSlotsResponse->json('slots');
        $this->assertNotEmpty($slotsBefore, 'There must be available slots on the selected future test date.');

        // Pick the first available slot
        $targetSlot = $slotsBefore[0];

        // Step 2: Book the chosen slot
        $bookingResponse = $this->postJson('/api/appointments', [
            'service_id' => $this->service->id,
            'barber_id' => $this->barber->id,
            'appointment_date' => $futureDate,
            'start_time' => $targetSlot,
            'client_phone' => '+212611223344',
            'notes' => 'Test de réservation dynamique',
        ]);

        $bookingResponse->assertStatus(201)
            ->assertJson([
                'status' => 'success',
            ]);

        // Step 3: Re-query available slots and assert that the booked slot is NO LONGER in available slots
        $afterSlotsResponse = $this->getJson("/api/available-slots?date={$futureDate}&barber_id={$this->barber->id}&duration={$this->service->duration}");
        $afterSlotsResponse->assertStatus(200);

        $slotsAfter = $afterSlotsResponse->json('slots');
        $bookedSlots = $afterSlotsResponse->json('booked_slots');

        $this->assertNotContains(
            $targetSlot,
            $slotsAfter,
            "The booked slot {$targetSlot} must be removed from available slots."
        );

        $this->assertContains(
            $targetSlot,
            $bookedSlots,
            "The booked slot {$targetSlot} must now appear in the booked_slots list."
        );
    }

    /**
     * b) Double-booking an already reserved slot fails with a 422 validation error.
     */
    public function test_double_booking_already_reserved_slot_fails_with_422(): void
    {
        Sanctum::actingAs($this->client, ['*']);

        $futureDate = Carbon::now()->addDays(3)->format('Y-m-d');
        $slot = '15:00';

        // 1st Booking: Successful creation
        $firstBooking = $this->postJson('/api/appointments', [
            'service_id' => $this->service->id,
            'barber_id' => $this->barber->id,
            'appointment_date' => $futureDate,
            'start_time' => $slot,
            'client_phone' => '+212611223344',
        ]);
        $firstBooking->assertStatus(201);

        // 2nd Booking: Attempting to double-book the same slot for the same barber
        $secondClient = User::role('client')->skip(1)->first() ?? User::factory()->create();
        if (! $secondClient->hasRole('client')) {
            $secondClient->assignRole('client');
        }
        Sanctum::actingAs($secondClient, ['*']);

        $duplicateBooking = $this->postJson('/api/appointments', [
            'service_id' => $this->service->id,
            'barber_id' => $this->barber->id,
            'appointment_date' => $futureDate,
            'start_time' => $slot,
            'client_phone' => '+212699887766',
        ]);

        $duplicateBooking->assertStatus(422)
            ->assertJsonValidationErrors(['start_time']);
    }
}

