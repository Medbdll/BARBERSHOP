<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('reviews')) {
            Schema::table('reviews', function (Blueprint $table) {
                if (!Schema::hasColumn('reviews', 'user_id')) {
                    $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->cascadeOnDelete();
                }
                if (!Schema::hasColumn('reviews', 'status')) {
                    $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->after('comment');
                }
            });

            // Backfill user_id from client_id if available
            if (Schema::hasColumn('reviews', 'user_id') && Schema::hasColumn('reviews', 'client_id')) {
                DB::statement("UPDATE reviews SET user_id = client_id WHERE user_id IS NULL AND client_id IS NOT NULL");
            }

            // Sync status from is_approved if available
            if (Schema::hasColumn('reviews', 'status') && Schema::hasColumn('reviews', 'is_approved')) {
                DB::statement("UPDATE reviews SET status = CASE WHEN is_approved = 1 THEN 'approved' ELSE 'pending' END WHERE status = 'pending'");
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('reviews')) {
            Schema::table('reviews', function (Blueprint $table) {
                if (Schema::hasColumn('reviews', 'user_id')) {
                    $table->dropForeign(['user_id']);
                    $table->dropColumn('user_id');
                }
                if (Schema::hasColumn('reviews', 'status')) {
                    $table->dropColumn('status');
                }
            });
        }
    }
};

