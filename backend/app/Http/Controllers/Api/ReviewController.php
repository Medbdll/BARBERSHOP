<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use App\Models\Appointment;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ReviewController extends Controller
{
    /**
     * GET /api/reviews/public
     * Return ONLY reviews where status = 'approved', ordered by latest(),
     * with user:id,name,avatar and barber:id,name.
     */
    public function publicIndex(): JsonResponse
    {
        $reviews = Cache::remember('public_approved_reviews', 1800, function () {
            return Review::where('status', 'approved')
                ->orWhere(function ($q) {
                    $q->where('is_approved', true)
                      ->where('status', '!=', 'rejected');
                })
                ->with([
                    'user:id,name,avatar,profile_photo_path',
                    'client:id,name,avatar,profile_photo_path',
                    'barber:id,name',
                ])
                ->latest()
                ->limit(30)
                ->get();
        });

        return response()->json([
            'status' => 'success',
            'data'   => ReviewResource::collection($reviews)->resolve(),
        ]);
    }

    /**
     * POST /api/reviews
     * Client submits a review. Newly created reviews ALWAYS default to status = 'pending'.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'rating'         => ['required', 'integer', 'min:1', 'max:5'],
            'comment'        => ['required', 'string', 'min:3', 'max:1000'],
            'barber_id'      => ['nullable', 'exists:barbers,id'],
            'appointment_id' => ['nullable', 'exists:appointments,id'],
            'comment_ar'     => ['nullable', 'string', 'max:1000'],
            'city'           => ['nullable', 'string', 'max:100'],
            'service_used'   => ['nullable', 'string', 'max:255'],
        ]);

        // If appointment_id provided, ensure it belongs to this client and infer service/barber if not given
        if (!empty($validated['appointment_id'])) {
            $appointment = Appointment::where('id', $validated['appointment_id'])
                ->where(function ($q) use ($user) {
                    $q->where('client_id', $user->id)
                      ->orWhere('user_id', $user->id);
                })
                ->first();

            if ($appointment) {
                if (empty($validated['barber_id'])) {
                    $validated['barber_id'] = $appointment->barber_id;
                }
                if (empty($validated['service_used']) && $appointment->service) {
                    $validated['service_used'] = $appointment->service->title_fr ?: $appointment->service->name;
                }
            }
        }

        $review = Review::create([
            'user_id'        => $user->id,
            'client_id'      => $user->id,
            'appointment_id' => $validated['appointment_id'] ?? null,
            'barber_id'      => $validated['barber_id'] ?? null,
            'rating'         => (int) $validated['rating'],
            'comment'        => $validated['comment'],
            'comment_ar'     => $validated['comment_ar'] ?? null,
            'city'           => $validated['city'] ?? null,
            'service_used'   => $validated['service_used'] ?? null,
            'status'         => 'pending',
            'is_approved'    => false,
        ]);

        // Reward client loyalty points if available
        if (method_exists($user, 'increment')) {
            $user->increment('loyalty_points', 20);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Merci pour votre précieux avis ! Il sera visible après validation par notre équipe.',
            'data'    => (new ReviewResource($review->load(['user', 'client', 'barber'])))->resolve(),
        ], 201);
    }
}

