<?php

namespace App\Models;

use App\Support\MediaUrl;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'title_fr',
        'title_ar',
        'category',
        'duration',
        'duration_minutes',
        'price',
        'description',
        'description_fr',
        'description_ar',
        'image_url',
        'is_active',
    ];

    protected $casts = [
        'duration' => 'integer',
        'duration_minutes' => 'integer',
        'price' => 'float',
        'is_active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::saving(function (Service $service) {
            // Keep name and title_fr in lockstep for backward compatibility
            if (! empty($service->title_fr) && empty($service->name)) {
                $service->name = $service->title_fr;
            } elseif (! empty($service->name) && empty($service->title_fr)) {
                $service->title_fr = $service->name;
            }

            if (empty($service->title_ar)) {
                $service->title_ar = $service->title_fr ?: $service->name;
            }

            if (! empty($service->description_fr) && empty($service->description)) {
                $service->description = $service->description_fr;
            } elseif (! empty($service->description) && empty($service->description_fr)) {
                $service->description_fr = $service->description;
            }

            if (empty($service->description_ar)) {
                $service->description_ar = $service->description_fr ?: $service->description;
            }

            if (isset($service->duration_minutes) && ! empty($service->duration_minutes)) {
                $service->duration = (int) $service->duration_minutes;
            } elseif (isset($service->duration) && ! empty($service->duration)) {
                $service->duration_minutes = (int) $service->duration;
            }
        });
    }

    public function getTitleFrAttribute(?string $value = null): ?string
    {
        return $value ?: ($this->attributes['name'] ?? null);
    }

    public function getTitleArAttribute(?string $value = null): ?string
    {
        return $value ?: ($this->attributes['title_fr'] ?? $this->attributes['name'] ?? null);
    }

    public function getDescriptionFrAttribute(?string $value = null): ?string
    {
        return $value ?: ($this->attributes['description'] ?? null);
    }

    public function getDescriptionArAttribute(?string $value = null): ?string
    {
        return $value ?: ($this->attributes['description_fr'] ?? $this->attributes['description'] ?? null);
    }

    public function getDurationMinutesAttribute(?int $value = null): int
    {
        return (int) ($value ?: ($this->attributes['duration'] ?? 30));
    }

    public function getDurationAttribute(?int $value = null): int
    {
        return (int) ($value ?: ($this->attributes['duration_minutes'] ?? 30));
    }

    public function getImageUrlAttribute(?string $value = null): ?string
    {
        return MediaUrl::toPublicUrl($value);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }
}
