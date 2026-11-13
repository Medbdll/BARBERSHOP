<?php

namespace App\Models;

use App\Support\MediaUrl;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;

class Barber extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'name',
        'title_fr',
        'title_ar',
        'specialty',
        'specialty_fr',
        'specialty_ar',
        'experience',
        'rating',
        'reviews_count',
        'bio',
        'image_url',
        'is_active',
    ];

    protected $casts = [
        'rating' => 'float',
        'is_active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::deleting(function (Barber $barber) {
            // Cancel future pending appointments when this barber leaves staff
            Appointment::where('barber_id', $barber->id)
                ->whereDate('appointment_date', '>=', Carbon::today()->toDateString())
                ->where('status', 'pending')
                ->update(['status' => 'cancelled']);

            if ($barber->is_active) {
                $barber->is_active = false;
                $barber->saveQuietly();
            }
        });

        static::deleted(function (Barber $barber) {
            $user = $barber->user_id ? User::find($barber->user_id) : null;
            if (! $user && ! empty($barber->name)) {
                $user = User::where('name', $barber->name)->first();
            }

            if ($user && $user->hasAnyRole(['employe', 'employee']) && ! $user->hasRole('admin')) {
                $user->syncRoles(['client']);
            }

            Cache::forget('public_barbers_list');
        });
    }

    public function getImageUrlAttribute(?string $value): ?string
    {
        return MediaUrl::toPublicUrl($value);
    }

    public function getPhotoAttribute(?string $value = null): ?string
    {
        return $value !== null ? MediaUrl::toPublicUrl($value) : $this->image_url;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function workingHours(): HasMany
    {
        return $this->hasMany(WorkingHour::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }
}

