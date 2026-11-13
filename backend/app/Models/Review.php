<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'appointment_id',
        'client_id',
        'barber_id',
        'rating',
        'comment',
        'comment_ar',
        'city',
        'service_used',
        'status',
        'is_approved',
    ];

    protected $casts = [
        'rating' => 'integer',
        'is_approved' => 'boolean',
        'status' => 'string',
    ];

    protected static function booted(): void
    {
        static::saving(function (Review $review) {
            // Keep user_id and client_id in sync
            if (!empty($review->user_id) && empty($review->client_id)) {
                $review->client_id = $review->user_id;
            } elseif (!empty($review->client_id) && empty($review->user_id)) {
                $review->user_id = $review->client_id;
            }

            // Keep status and is_approved in sync
            if (!empty($review->status)) {
                $review->is_approved = ($review->status === 'approved');
            } elseif (isset($review->is_approved)) {
                $review->status = $review->is_approved ? 'approved' : 'pending';
            } else {
                $review->status = 'pending';
                $review->is_approved = false;
            }
        });
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function barber(): BelongsTo
    {
        return $this->belongsTo(Barber::class);
    }
}
