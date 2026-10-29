<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class BarberShopController extends Controller
{
    /**
     * Check backend API status.
     */
    public function status(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'message' => 'Backend connected successfully!',
            'app' => config('app.name', 'BERBER'),
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * Fetch list of barber shop services.
     */
    public function services(): JsonResponse
    {
        return response()->json([
            [
                'id' => 1,
                'name' => 'Classic Haircut',
                'duration' => '30 min',
                'price' => '$25.00',
                'description' => 'Precision cut tailored to your style with a hot lather neck shave.',
            ],
            [
                'id' => 2,
                'name' => 'Beard Sculpting & Trim',
                'duration' => '20 min',
                'price' => '$18.00',
                'description' => 'Detailed shaping, line-up, and nourishing organic beard oil.',
            ],
            [
                'id' => 3,
                'name' => 'Traditional Hot Towel Shave',
                'duration' => '45 min',
                'price' => '$35.00',
                'description' => 'Pre-shave essential oils, warm towels, and straight razor precision.',
            ],
            [
                'id' => 4,
                'name' => 'Full Executive Package',
                'duration' => '60 min',
                'price' => '$50.00',
                'description' => 'Haircut, beard trim, facial scrub, and styling.',
            ],
        ]);
    }

    /**
     * Fetch list of barbers.
     */
    public function barbers(): JsonResponse
    {
        return response()->json([
            [
                'id' => 1,
                'name' => 'Alex Fade',
                'title' => 'Master Barber',
                'rating' => 4.9,
                'experience' => '8 years',
            ],
            [
                'id' => 2,
                'name' => 'Samir Blade',
                'title' => 'Senior Stylist',
                'rating' => 4.8,
                'experience' => '6 years',
            ],
            [
                'id' => 3,
                'name' => 'Marcus Razor',
                'title' => 'Beard Specialist',
                'rating' => 5.0,
                'experience' => '10 years',
            ],
        ]);
    }
}

