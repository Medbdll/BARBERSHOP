<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AdminReviewController extends Controller
{
    /**
     * GET /api/admin/reviews
     * Return all reviews (pending, approved, rejected) with user and barber details,
     * plus counts for each status.
     */
    public function index(): JsonResponse
    {
        $reviews = Review::with([
                'user:id,name,avatar,profile_photo_path',
                'client:id,name,avatar,profile_photo_path',
                'barber:id,name',
            ])
            ->latest()
            ->get();

        $counts = [
            'total'    => $reviews->count(),
            'pending'  => $reviews->where('status', 'pending')->count(),
            'approved' => $reviews->where('status', 'approved')->count(),
            'rejected' => $reviews->where('status', 'rejected')->count(),
        ];

        return response()->json([
            'status' => 'success',
            'data'   => ReviewResource::collection($reviews)->resolve(),
            'counts' => $counts,
        ]);
    }

    /**
     * PATCH /api/admin/reviews/{review}/status
     * Validate status in approved,rejected,pending and update the review.
     */
    public function updateStatus(Request $request, Review $review): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:approved,rejected,pending'],
        ]);

        $status = $validated['status'];

        $review->update([
            'status'      => $status,
            'is_approved' => ($status === 'approved'),
        ]);

        Cache::forget('public_approved_reviews');

        return response()->json([
            'status'  => 'success',
            'message' => 'Statut de l\'avis mis à jour avec succès.',
            'data'    => (new ReviewResource($review->load(['user', 'client', 'barber'])))->resolve(),
        ]);
    }

    /**
     * DELETE /api/admin/reviews/{review}
     * Permanently delete a spam/inappropriate review.
     */
    public function destroy(Review $review): JsonResponse
    {
        $review->delete();

        Cache::forget('public_approved_reviews');

        return response()->json([
            'status'  => 'success',
            'message' => 'Avis supprimé définitivement.',
        ]);
    }
}

