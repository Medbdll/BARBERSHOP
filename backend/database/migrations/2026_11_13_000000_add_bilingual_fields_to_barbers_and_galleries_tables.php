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
        if (Schema::hasTable('barbers')) {
            Schema::table('barbers', function (Blueprint $table) {
                if (! Schema::hasColumn('barbers', 'title_fr')) {
                    $table->string('title_fr')->nullable()->after('name');
                }
                if (! Schema::hasColumn('barbers', 'title_ar')) {
                    $table->string('title_ar')->nullable()->after('title_fr');
                }
                if (! Schema::hasColumn('barbers', 'specialty_fr')) {
                    $table->string('specialty_fr')->nullable()->after('specialty');
                }
                if (! Schema::hasColumn('barbers', 'specialty_ar')) {
                    $table->string('specialty_ar')->nullable()->after('specialty_fr');
                }
                if (! Schema::hasColumn('barbers', 'reviews_count')) {
                    $table->integer('reviews_count')->default(500)->after('rating');
                }
            });
        }

        if (Schema::hasTable('galleries')) {
            Schema::table('galleries', function (Blueprint $table) {
                if (! Schema::hasColumn('galleries', 'title_fr')) {
                    $table->string('title_fr')->nullable()->after('title');
                }
                if (! Schema::hasColumn('galleries', 'title_ar')) {
                    $table->string('title_ar')->nullable()->after('title_fr');
                }
                if (! Schema::hasColumn('galleries', 'col_span')) {
                    $table->string('col_span')->nullable()->after('image_url');
                }
            });
        }

        if (Schema::hasTable('reviews')) {
            Schema::table('reviews', function (Blueprint $table) {
                if (! Schema::hasColumn('reviews', 'city')) {
                    $table->string('city')->nullable()->after('barber_id');
                }
                if (! Schema::hasColumn('reviews', 'service_used')) {
                    $table->string('service_used')->nullable()->after('city');
                }
                if (! Schema::hasColumn('reviews', 'comment_ar')) {
                    $table->text('comment_ar')->nullable()->after('comment');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('reviews')) {
            Schema::table('reviews', function (Blueprint $table) {
                $columns = array_filter(['city', 'service_used', 'comment_ar'], fn ($col) => Schema::hasColumn('reviews', $col));
                if (! empty($columns)) {
                    $table->dropColumn($columns);
                }
            });
        }

        if (Schema::hasTable('galleries')) {
            Schema::table('galleries', function (Blueprint $table) {
                $columns = array_filter(['title_fr', 'title_ar', 'col_span'], fn ($col) => Schema::hasColumn('galleries', $col));
                if (! empty($columns)) {
                    $table->dropColumn($columns);
                }
            });
        }

        if (Schema::hasTable('barbers')) {
            Schema::table('barbers', function (Blueprint $table) {
                $columns = array_filter(['title_fr', 'title_ar', 'specialty_fr', 'specialty_ar', 'reviews_count'], fn ($col) => Schema::hasColumn('barbers', $col));
                if (! empty($columns)) {
                    $table->dropColumn($columns);
                }
            });
        }
    }
};

