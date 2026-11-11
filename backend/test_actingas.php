<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Laravel\Sanctum\Sanctum;

$user = User::first();
Sanctum::actingAs($user, ['*']);

$token = $user->currentAccessToken();
echo "Sanctum::actingAs token type: " . get_class($token) . "\n";
echo "Is instance of PersonalAccessToken? " . ($token instanceof \Laravel\Sanctum\PersonalAccessToken ? 'YES' : 'NO') . "\n";
echo "Parent class: " . get_parent_class($token) . "\n";

