<?php

namespace Tests\Feature;

use App\Models\Barber;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ReviewsModerationTest extends TestCase
{
    use DatabaseTransactions;

    protected User $admin;
    protected User $client;
    protected Barber $barber;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'sanctum']);
        Role::firstOrCreate(['name' => 'client', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'client', 'guard_name' => 'sanctum']);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->client = User::factory()->create();
        $this->client->assignRole('client');

        $this->barber = Barber::create([
            'name' => 'Samir Test',
            'specialty' => 'Coupe & Barbe',
            'experience' => '5 ans',
            'rating' => 5.0,
            'is_active' => true,
        ]);
    }

    public function test_client_can_submit_review_defaulting_to_pending(): void
    {
        $payload = [
            'barber_id' => $this->barber->id,
            'rating'    => 5,
            'comment'   => 'Service exceptionnel et accueil très chaleureux.',
            'city'      => 'Casablanca',
        ];

        $response = $this->actingAs($this->client, 'sanctum')
            ->postJson('/api/reviews', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.is_approved', false);

        $this->assertDatabaseHas('reviews', [
            'user_id' => $this->client->id,
            'barber_id' => $this->barber->id,
            'rating' => 5,
            'status' => 'pending',
            'is_approved' => false,
        ]);
    }

    public function test_public_reviews_only_returns_approved_reviews(): void
    {
        // 1 pending
        Review::create([
            'user_id'   => $this->client->id,
            'barber_id' => $this->barber->id,
            'rating'    => 4,
            'comment'   => 'En attente de modération.',
            'status'    => 'pending',
            'is_approved' => false,
        ]);

        // 1 rejected
        Review::create([
            'user_id'   => $this->client->id,
            'barber_id' => $this->barber->id,
            'rating'    => 1,
            'comment'   => 'Avis inapproprié rejeté.',
            'status'    => 'rejected',
            'is_approved' => false,
        ]);

        // 1 approved
        $approved = Review::create([
            'user_id'   => $this->client->id,
            'barber_id' => $this->barber->id,
            'rating'    => 5,
            'comment'   => 'Avis approuvé public.',
            'status'    => 'approved',
            'is_approved' => true,
        ]);

        Cache::forget('public_approved_reviews');
        $response = $this->getJson('/api/reviews/public');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $data = $response->json('data');
        $approvedIds = collect($data)->pluck('id')->all();
        $this->assertContains($approved->id, $approvedIds);
        foreach ($data as $item) {
            $this->assertEquals('approved', $item['status']);
        }
    }

    public function test_admin_can_list_all_reviews_with_status_counts(): void
    {
        $initialTotal = Review::count();
        $initialPending = Review::where('status', 'pending')->count();
        $initialApproved = Review::where('status', 'approved')->count();

        Review::create([
            'user_id'   => $this->client->id,
            'barber_id' => $this->barber->id,
            'rating'    => 5,
            'comment'   => 'Avis 1',
            'status'    => 'pending',
        ]);

        Review::create([
            'user_id'   => $this->client->id,
            'barber_id' => $this->barber->id,
            'rating'    => 5,
            'comment'   => 'Avis 2',
            'status'    => 'approved',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/reviews');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data',
                'counts' => ['total', 'pending', 'approved', 'rejected'],
            ]);

        $this->assertEquals($initialTotal + 2, $response->json('counts.total'));
        $this->assertEquals($initialPending + 1, $response->json('counts.pending'));
        $this->assertEquals($initialApproved + 1, $response->json('counts.approved'));
    }

    public function test_admin_can_update_review_status(): void
    {
        $review = Review::create([
            'user_id'   => $this->client->id,
            'barber_id' => $this->barber->id,
            'rating'    => 5,
            'comment'   => 'Avis modéré.',
            'status'    => 'pending',
        ]);

        // Approve
        $response = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/admin/reviews/{$review->id}/status", [
                'status' => 'approved',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.is_approved', true);

        $this->assertDatabaseHas('reviews', [
            'id' => $review->id,
            'status' => 'approved',
            'is_approved' => true,
        ]);

        // Reject
        $response = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/admin/reviews/{$review->id}/status", [
                'status' => 'rejected',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.is_approved', false);

        $this->assertDatabaseHas('reviews', [
            'id' => $review->id,
            'status' => 'rejected',
            'is_approved' => false,
        ]);
    }

    public function test_admin_can_delete_review(): void
    {
        $review = Review::create([
            'user_id'   => $this->client->id,
            'barber_id' => $this->barber->id,
            'rating'    => 1,
            'comment'   => 'Spam test.',
            'status'    => 'rejected',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/admin/reviews/{$review->id}");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $this->assertDatabaseMissing('reviews', [
            'id' => $review->id,
        ]);
    }

    public function test_non_admin_cannot_access_moderation(): void
    {
        $review = Review::create([
            'user_id'   => $this->client->id,
            'barber_id' => $this->barber->id,
            'rating'    => 5,
            'comment'   => 'Test',
            'status'    => 'pending',
        ]);

        $response = $this->actingAs($this->client, 'sanctum')
            ->getJson('/api/admin/reviews');

        $response->assertStatus(403);

        $patchResponse = $this->actingAs($this->client, 'sanctum')
            ->patchJson("/api/admin/reviews/{$review->id}/status", [
                'status' => 'approved',
            ]);

        $patchResponse->assertStatus(403);
    }
}
