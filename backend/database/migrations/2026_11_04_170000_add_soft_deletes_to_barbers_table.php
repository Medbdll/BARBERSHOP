<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('barbers') && !Schema::hasColumn('barbers', 'deleted_at')) {
            Schema::table('barbers', function (Blueprint $table) {
                $table->softDeletes()->after('is_active');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('barbers') && Schema::hasColumn('barbers', 'deleted_at')) {
            Schema::table('barbers', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }
    }
};

