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
        if (Schema::hasTable('services')) {
            Schema::table('services', function (Blueprint $table) {
                if (! Schema::hasColumn('services', 'title_fr')) {
                    $table->string('title_fr')->nullable()->after('name');
                }
                if (! Schema::hasColumn('services', 'title_ar')) {
                    $table->string('title_ar')->nullable()->after('title_fr');
                }
                if (! Schema::hasColumn('services', 'description_fr')) {
                    $table->text('description_fr')->nullable()->after('description');
                }
                if (! Schema::hasColumn('services', 'description_ar')) {
                    $table->text('description_ar')->nullable()->after('description_fr');
                }
                if (! Schema::hasColumn('services', 'duration_minutes')) {
                    $table->integer('duration_minutes')->nullable()->default(30)->after('duration');
                }
            });

            // Backfill existing records cleanly
            DB::statement('UPDATE services SET title_fr = name WHERE title_fr IS NULL AND name IS NOT NULL');
            DB::statement('UPDATE services SET title_ar = name WHERE title_ar IS NULL AND name IS NOT NULL');
            DB::statement('UPDATE services SET description_fr = description WHERE description_fr IS NULL AND description IS NOT NULL');
            DB::statement('UPDATE services SET description_ar = description WHERE description_ar IS NULL AND description IS NOT NULL');
            if (Schema::hasColumn('services', 'duration')) {
                DB::statement('UPDATE services SET duration_minutes = duration WHERE duration_minutes IS NULL AND duration IS NOT NULL');
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('services')) {
            Schema::table('services', function (Blueprint $table) {
                $columnsToDrop = [];
                if (Schema::hasColumn('services', 'title_fr')) {
                    $columnsToDrop[] = 'title_fr';
                }
                if (Schema::hasColumn('services', 'title_ar')) {
                    $columnsToDrop[] = 'title_ar';
                }
                if (Schema::hasColumn('services', 'description_fr')) {
                    $columnsToDrop[] = 'description_fr';
                }
                if (Schema::hasColumn('services', 'description_ar')) {
                    $columnsToDrop[] = 'description_ar';
                }
                if (Schema::hasColumn('services', 'duration_minutes')) {
                    $columnsToDrop[] = 'duration_minutes';
                }
                if (! empty($columnsToDrop)) {
                    $table->dropColumn($columnsToDrop);
                }
            });
        }
    }
};
