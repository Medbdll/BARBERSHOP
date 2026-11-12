<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/


Route::get('/', function () {
    return redirect(config('app.frontend_url', 'https://barberoza.shop'));
});

// Fallback route for shared hosting or environments where public/storage symlink is missing
Route::get('/storage/{path}', function (string $path) {
    $cleanPath = ltrim(str_replace(['..', '\\'], ['', '/'], $path), '/');

    if ($cleanPath === '' || ! Storage::disk('public')->exists($cleanPath)) {
        abort(404);
    }

    return Storage::disk('public')->response($cleanPath, null, [
        'Cache-Control' => 'public, max-age=31536000',
    ]);
})->where('path', '.*');

Route::fallback(function () {
    return response()->json(['message' => 'Not Found'], 404);
});

Route::middleware([
    'auth:sanctum',
    config('jetstream.auth_session'),
    'verified',
])->group(function () {
    Route::get('/dashboard', function () {
        return view('dashboard');
    })->name('dashboard');
});
