<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::get('/status', function () {
    return response()->json([
        'status' => 'success',
        'message' => 'Backend connected successfully!',
        'app' => config('app.name', 'BERBER'),
        'timestamp' => now()->toIso8601String(),
    ]);
});

Route::get('/services', function () {
    return response()->json([
        [
            'id' => 1,
            'name' => 'Classic Haircut',
            'duration' => '30 min',
            'price' => '$25.00',
            'description' => 'Precision cut tailored to your style with a hot lather neck shave.'
        ],
        [
            'id' => 2,
            'name' => 'Beard Sculpting & Trim',
            'duration' => '20 min',
            'price' => '$18.00',
            'description' => 'Detailed shaping, line-up, and nourishing organic beard oil.'
        ],
        [
            'id' => 3,
            'name' => 'Traditional Hot Towel Shave',
            'duration' => '45 min',
            'price' => '$35.00',
            'description' => 'Pre-shave essential oils, warm towels, and straight razor precision.'
        ],
        [
            'id' => 4,
            'name' => 'Full Executive Package',
            'duration' => '60 min',
            'price' => '$50.00',
            'description' => 'Haircut, beard trim, facial scrub, and styling.'
        ]
    ]);
});

Route::get('/barbers', function () {
    return response()->json([
        [
            'id' => 1,
            'name' => 'Alex Fade',
            'title' => 'Master Barber',
            'rating' => 4.9,
            'experience' => '8 years'
        ],
        [
            'id' => 2,
            'name' => 'Samir Blade',
            'title' => 'Senior Stylist',
            'rating' => 4.8,
            'experience' => '6 years'
        ],
        [
            'id' => 3,
            'name' => 'Marcus Razor',
            'title' => 'Beard Specialist',
            'rating' => 5.0,
            'experience' => '10 years'
        ]
    ]);
});

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});
