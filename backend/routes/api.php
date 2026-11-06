<?php

use App\Http\Controllers\Api\AdminApiController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClientAppointmentController;
use App\Http\Controllers\Api\EmployeScheduleController;
use App\Http\Controllers\Api\PublicApiController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| BARBERSHOP HEADLESS REST API (Laravel 11 + Sanctum + Spatie RBAC)
|--------------------------------------------------------------------------
*/

// ========================================================
// 1. PUBLIC ROUTES
// ========================================================
Route::get('/services', [PublicApiController::class, 'services']);
Route::get('/barbers', [PublicApiController::class, 'barbers']);
Route::get('/available-slots', [PublicApiController::class, 'availableSlots']);
Route::get('/reviews', [PublicApiController::class, 'reviews']);
Route::get('/gallery', [PublicApiController::class, 'gallery']);

// Authentication Routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// ========================================================
// 2. AUTHENTICATED USER COMMON ROUTES
// ========================================================
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/user', [AuthController::class, 'me']); // Backward compatibility
    Route::post('/logout', [AuthController::class, 'logout']);
});

// ========================================================
// 3. CLIENT ROUTES (auth:sanctum, role:client)
// ========================================================
Route::middleware(['auth:sanctum', 'role:client'])->prefix('client')->group(function () {
    Route::get('/appointments', [ClientAppointmentController::class, 'index']);
    Route::patch('/appointments/{id}/cancel', [ClientAppointmentController::class, 'cancel']);
    Route::patch('/appointments/{id}/reschedule', [ClientAppointmentController::class, 'reschedule']);
    Route::post('/reviews', [ClientAppointmentController::class, 'leaveReview']);
    Route::get('/loyalty', [ClientAppointmentController::class, 'loyalty']);
});

// Direct booking route for authenticated clients
Route::middleware(['auth:sanctum', 'role:client'])->group(function () {
    Route::post('/appointments', [ClientAppointmentController::class, 'store']);
});

// ========================================================
// 4. EMPLOYÉ / BARBER ROUTES (auth:sanctum, role:employe|admin)
// Supports both /api/employee and /api/employe prefixes
// ========================================================
Route::middleware(['auth:sanctum', 'role:employe|admin'])->prefix('employee')->group(function () {
    Route::get('/appointments', [EmployeScheduleController::class, 'appointments']);
    Route::patch('/appointments/{id}/status', [EmployeScheduleController::class, 'updateStatus']);
    Route::get('/schedule', [EmployeScheduleController::class, 'schedule']);
    Route::put('/working-hours', [EmployeScheduleController::class, 'updateWorkingHours']);
});

Route::middleware(['auth:sanctum', 'role:employe|admin'])->prefix('employe')->group(function () {
    Route::get('/appointments', [EmployeScheduleController::class, 'appointments']);
    Route::patch('/appointments/{id}/status', [EmployeScheduleController::class, 'updateStatus']);
    Route::get('/schedule', [EmployeScheduleController::class, 'schedule']);
    Route::put('/working-hours', [EmployeScheduleController::class, 'updateWorkingHours']);
});

// ========================================================
// 5. ADMIN ROUTES (auth:sanctum, role:admin)
// ========================================================
Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
    // Analytics & KPIs for Chart.js
    Route::get('/stats', [AdminApiController::class, 'stats']);

    // Appointments Management
    Route::get('/appointments', [AdminApiController::class, 'appointmentsIndex']);
    Route::patch('/appointments/{id}/status', [AdminApiController::class, 'appointmentsUpdateStatus']);
    Route::put('/appointments/{id}', [AdminApiController::class, 'appointmentsUpdate']);

    // Users & Roles Management
    Route::get('/users', [AdminApiController::class, 'usersIndex']);
    Route::post('/users', [AdminApiController::class, 'usersStore']);
    Route::delete('/users/{id}', [AdminApiController::class, 'usersDestroy']);
    Route::post('/users/{id}/sync-roles', [AdminApiController::class, 'syncRoles']);

    // Spatie Roles & Permissions Matrix
    Route::get('/roles-permissions', [AdminApiController::class, 'rolesPermissions']);
    Route::post('/roles/{id}/sync-permissions', [AdminApiController::class, 'syncPermissions']);

    // Services apiResource
    Route::get('/services', [AdminApiController::class, 'servicesIndex']);
    Route::post('/services', [AdminApiController::class, 'servicesStore']);
    Route::put('/services/{id}', [AdminApiController::class, 'servicesUpdate']);
    Route::delete('/services/{id}', [AdminApiController::class, 'servicesDestroy']);

    // Barbers apiResource
    Route::get('/barbers', [AdminApiController::class, 'barbersIndex']);
    Route::post('/barbers', [AdminApiController::class, 'barbersStore']);
    Route::put('/barbers/{id}', [AdminApiController::class, 'barbersUpdate']);
    Route::delete('/barbers/{id}', [AdminApiController::class, 'barbersDestroy']);

    // Reviews Moderation
    Route::patch('/reviews/{id}/approve', [AdminApiController::class, 'approveReview']);
});
