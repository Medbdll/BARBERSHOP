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
        'category',
        'duration',
        'price',
        'description',
        'image_url',
        'is_active',
    ];

    protected $casts = [
        'duration' => 'integer',
        'price' => 'float',
        'is_active' => 'boolean',
    ];

    public function getImageUrlAttribute(?string $value = null): ?string
    {
        return MediaUrl::toPublicUrl($value);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }
}

