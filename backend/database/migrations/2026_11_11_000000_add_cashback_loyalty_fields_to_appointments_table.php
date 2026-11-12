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
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (! Schema::hasColumn('users', 'loyalty_points')) {
                    $table->integer('loyalty_points')->default(0)->after('phone');
                } else {
                    $table->integer('loyalty_points')->default(0)->change();
                }
            });
        }

        if (Schema::hasTable('appointments')) {
            Schema::table('appointments', function (Blueprint $table) {
                if (! Schema::hasColumn('appointments', 'subtotal_price')) {
                    $table->decimal('subtotal_price', 8, 2)->default(0)->after('status');
                }
                if (! Schema::hasColumn('appointments', 'points_used')) {
                    $table->integer('points_used')->default(0)->after('subtotal_price');
                }
                if (! Schema::hasColumn('appointments', 'discount_amount')) {
                    $table->decimal('discount_amount', 8, 2)->default(0)->after('points_used');
                }
                if (! Schema::hasColumn('appointments', 'points_earned')) {
                    $table->integer('points_earned')->default(0)->after('total_price');
                }
                if (! Schema::hasColumn('appointments', 'points_credited')) {
                    $table->boolean('points_credited')->default(false)->after('points_earned');
                }
            });

            // Backfill subtotal_price for pre-existing appointments
            DB::table('appointments')
                ->where('subtotal_price', 0)
                ->update([
                    'subtotal_price' => DB::raw('total_price'),
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('appointments')) {
            Schema::table('appointments', function (Blueprint $table) {
                foreach (['points_credited', 'points_earned', 'discount_amount', 'points_used', 'subtotal_price'] as $col) {
                    if (Schema::hasColumn('appointments', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};

