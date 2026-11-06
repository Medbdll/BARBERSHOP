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
        Schema::table('appointments', function (Blueprint $table) {
            $table->index('appointment_date', 'idx_appointments_date');
            $table->index('status', 'idx_appointments_status');
            $table->index(['appointment_date', 'status'], 'idx_appointments_date_status');
            $table->index(['barber_id', 'appointment_date', 'status'], 'idx_appointments_barber_date_status');
            $table->index(['client_id', 'appointment_date'], 'idx_appointments_client_date');
        });

        Schema::table('services', function (Blueprint $table) {
            $table->index('is_active', 'idx_services_active');
            $table->index(['is_active', 'category'], 'idx_services_active_category');
        });

        Schema::table('barbers', function (Blueprint $table) {
            $table->index('is_active', 'idx_barbers_active');
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->index('is_approved', 'idx_reviews_approved');
            $table->index(['is_approved', 'created_at'], 'idx_reviews_approved_created');
        });

        Schema::table('working_hours', function (Blueprint $table) {
            $table->index(['barber_id', 'day_of_week'], 'idx_working_hours_barber_day');
        });

        Schema::table('galleries', function (Blueprint $table) {
            $table->index('is_active', 'idx_galleries_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex('idx_appointments_date');
            $table->dropIndex('idx_appointments_status');
            $table->dropIndex('idx_appointments_date_status');
            $table->dropIndex('idx_appointments_barber_date_status');
            $table->dropIndex('idx_appointments_client_date');
        });

        Schema::table('services', function (Blueprint $table) {
            $table->dropIndex('idx_services_active');
            $table->dropIndex('idx_services_active_category');
        });

        Schema::table('barbers', function (Blueprint $table) {
            $table->dropIndex('idx_barbers_active');
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->dropIndex('idx_reviews_approved');
            $table->dropIndex('idx_reviews_approved_created');
        });

        Schema::table('working_hours', function (Blueprint $table) {
            $table->dropIndex('idx_working_hours_barber_day');
        });

        Schema::table('galleries', function (Blueprint $table) {
            $table->dropIndex('idx_galleries_active');
        });
    }
};

