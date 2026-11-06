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
        // 1. Add loyalty_points to users table if not already present
        if (!Schema::hasColumn('users', 'loyalty_points')) {
            Schema::table('users', function (Blueprint $table) {
                $table->integer('loyalty_points')->default(50)->after('phone');
            });
        }

        // 2. Services Table
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('category')->default('hair'); // hair, beard, care, vip
            $table->integer('duration')->default(30); // in minutes
            $table->decimal('price', 8, 2); // in MAD
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 3. Barbers Table (linked to a user account with employe role)
        Schema::create('barbers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('specialty')->nullable();
            $table->string('experience')->nullable();
            $table->decimal('rating', 3, 1)->default(5.0);
            $table->text('bio')->nullable();
            $table->string('image_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 4. Working Hours / Shifts Table
        Schema::create('working_hours', function (Blueprint $table) {
            $table->id();
            $table->foreignId('barber_id')->constrained('barbers')->cascadeOnDelete();
            $table->tinyInteger('day_of_week'); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
            $table->time('start_time')->default('09:30:00');
            $table->time('end_time')->default('20:30:00');
            $table->time('break_start')->nullable();
            $table->time('break_end')->nullable();
            $table->boolean('is_day_off')->default(false);
            $table->timestamps();
        });

        // 5. Appointments Table
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('barber_id')->constrained('barbers')->cascadeOnDelete();
            $table->foreignId('service_id')->constrained('services')->cascadeOnDelete();
            $table->date('appointment_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->enum('status', ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'])->default('pending');
            $table->decimal('total_price', 8, 2);
            $table->text('notes')->nullable();
            $table->timestamps();

            // Prevent double-booking for the same barber at the same date and time
            $table->index(['barber_id', 'appointment_date', 'start_time']);
        });

        // 6. Reviews Table
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->nullable()->constrained('appointments')->nullOnDelete();
            $table->foreignId('client_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('barber_id')->constrained('barbers')->cascadeOnDelete();
            $table->tinyInteger('rating')->default(5); // 1-5
            $table->text('comment');
            $table->boolean('is_approved')->default(false);
            $table->timestamps();
        });

        // 7. Gallery / Lookbook Table
        Schema::create('galleries', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('category')->default('Coupe');
            $table->string('image_url');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('galleries');
        Schema::dropIfExists('reviews');
        Schema::dropIfExists('appointments');
        Schema::dropIfExists('working_hours');
        Schema::dropIfExists('barbers');
        Schema::dropIfExists('services');

        if (Schema::hasColumn('users', 'loyalty_points')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('loyalty_points');
            });
        }
    }
};
