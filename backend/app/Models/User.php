<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Cache;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Jetstream\HasProfilePhoto;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens;
    use HasFactory;
    use HasProfilePhoto;
    use HasRoles {
        assignRole as protected traitAssignRole;
        syncRoles as protected traitSyncRoles;
        removeRole as protected traitRemoveRole;
    }
    use Notifiable;
    use TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'loyalty_points',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_recovery_codes',
        'two_factor_secret',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'loyalty_points' => 'integer',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'profile_photo_url',
    ];

    public function appointments(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Appointment::class, 'client_id');
    }

    public function barberProfile(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Barber::class, 'user_id');
    }

    public function reviews(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Review::class, 'client_id');
    }

    /**
     * Model events for automatic barber synchronization on update or deletion.
     */
    protected static function booted(): void
    {
        static::updated(function (User $user) {
            if ($user->wasChanged('name') && $user->hasAnyRole(['employe', 'employee'])) {
                Barber::withTrashed()
                    ->where('user_id', $user->id)
                    ->update(['name' => $user->name]);
                Cache::forget('public_barbers_list');
            }
        });

        static::deleting(function (User $user) {
            $barber = Barber::withTrashed()->where('user_id', $user->id)->first();
            if ($barber) {
                if ($barber->appointments()->exists()) {
                    $barber->update(['is_active' => false]);
                    $barber->delete();
                } else {
                    $barber->workingHours()->delete();
                    $barber->reviews()->delete();
                    $barber->forceDelete();
                }
                Cache::forget('public_barbers_list');
            }
        });
    }

    /**
     * Intercept role assignments to trigger barber synchronization.
     */
    public function assignRole(...$roles)
    {
        $result = $this->traitAssignRole(...$roles);
        $this->syncBarberProfile();
        return $result;
    }

    /**
     * Intercept role synchronization to trigger barber synchronization.
     */
    public function syncRoles(...$roles)
    {
        $result = $this->traitSyncRoles(...$roles);
        $this->syncBarberProfile();
        return $result;
    }

    /**
     * Intercept role removals to trigger barber synchronization.
     */
    public function removeRole($role)
    {
        $result = $this->traitRemoveRole($role);
        $this->syncBarberProfile();
        return $result;
    }

    /**
     * Synchronize the user's role status with the barbers table.
     * If the user holds the employee role, automatically creates or restores their Barber record.
     * If demoted or removed, automatically deactivates and soft-deletes their Barber record.
     */
    public function syncBarberProfile(): ?Barber
    {
        $this->unsetRelation('roles');
        $isEmployee = $this->hasAnyRole(['employe', 'employee']);

        $defaultWorkingHours = [
            ['day_of_week' => 1, 'start_time' => '09:30:00', 'end_time' => '20:30:00', 'break_start' => '13:00:00', 'break_end' => '14:00:00', 'is_day_off' => false],
            ['day_of_week' => 2, 'start_time' => '09:30:00', 'end_time' => '20:30:00', 'break_start' => '13:00:00', 'break_end' => '14:00:00', 'is_day_off' => false],
            ['day_of_week' => 3, 'start_time' => '09:30:00', 'end_time' => '20:30:00', 'break_start' => '13:00:00', 'break_end' => '14:00:00', 'is_day_off' => false],
            ['day_of_week' => 4, 'start_time' => '09:30:00', 'end_time' => '20:30:00', 'break_start' => '13:00:00', 'break_end' => '14:00:00', 'is_day_off' => false],
            ['day_of_week' => 5, 'start_time' => '09:30:00', 'end_time' => '20:30:00', 'break_start' => '13:00:00', 'break_end' => '14:00:00', 'is_day_off' => false],
            ['day_of_week' => 6, 'start_time' => '09:30:00', 'end_time' => '20:30:00', 'break_start' => '13:00:00', 'break_end' => '14:00:00', 'is_day_off' => false],
            ['day_of_week' => 0, 'start_time' => '09:30:00', 'end_time' => '20:30:00', 'break_start' => null, 'break_end' => null, 'is_day_off' => true],
        ];

        if ($isEmployee) {
            // Restore or create record in barbers table
            $barber = Barber::withTrashed()->where('user_id', $this->id)->first();

            if ($barber) {
                if ($barber->trashed()) {
                    $barber->restore();
                }
                $barber->update([
                    'name' => $this->name,
                    'is_active' => true,
                    'deleted_at' => null,
                ]);

                if ($barber->workingHours()->count() === 0) {
                    foreach ($defaultWorkingHours as $wh) {
                        $barber->workingHours()->create($wh);
                    }
                }
            } else {
                $barber = Barber::create([
                    'user_id' => $this->id,
                    'name' => $this->name,
                    'specialty' => 'Maître Barbier & Styliste',
                    'experience' => '5 ans',
                    'rating' => 5.0,
                    'bio' => 'Professionnel dédié aux rituels de soins masculins et coiffures modernes.',
                    'image_url' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
                    'is_active' => true,
                ]);

                foreach ($defaultWorkingHours as $wh) {
                    $barber->workingHours()->create($wh);
                }
            }

            Cache::forget('public_barbers_list');

            return $barber;
        } else {
            // User does not hold employee role: deactivate or delete barber profile
            $barber = Barber::withTrashed()->where('user_id', $this->id)->first();

            if ($barber) {
                // If barber has linked appointments, soft-delete and deactivate to preserve history
                if ($barber->appointments()->exists()) {
                    $barber->update(['is_active' => false]);
                    $barber->delete(); // Soft delete
                } else {
                    $barber->workingHours()->delete();
                    $barber->reviews()->delete();
                    $barber->forceDelete();
                }

                Cache::forget('public_barbers_list');
            }

            return null;
        }
    }
}
