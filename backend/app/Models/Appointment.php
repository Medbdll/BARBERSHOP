<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Appointment extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'barber_id',
        'service_id',
        'appointment_date',
        'start_time',
        'end_time',
        'status',
        'subtotal_price',
        'points_used',
        'discount_amount',
        'total_price',
        'points_earned',
        'points_credited',
        'notes',
    ];

    protected $casts = [
        'appointment_date' => 'date',
        'subtotal_price' => 'float',
        'points_used' => 'integer',
        'discount_amount' => 'float',
        'total_price' => 'float',
        'points_earned' => 'integer',
        'points_credited' => 'boolean',
    ];

    /**
     * Compute loyalty points earned for a given paid MAD amount (100 MAD = 20 pts, i.e. 1 pt per 5 MAD).
     */
    public static function calculateEarnedPointsForAmount(float $paidAmount): int
    {
        if ($paidAmount <= 0) {
            return 0;
        }

        return (int) floor(round(($paidAmount / 100) * 20, 6));
    }

    /**
     * Credit loyalty cashback points once when the appointment is marked completed.
     * Guards against double crediting using `points_credited`.
     */
    public function creditLoyaltyPoints(): int
    {
        if ($this->points_credited) {
            return 0;
        }

        $earned = static::calculateEarnedPointsForAmount((float) $this->total_price);

        $this->update([
            'points_earned' => $earned,
            'points_credited' => true,
        ]);

        if ($earned > 0 && $this->client) {
            $this->client->increment('loyalty_points', $earned);
        }

        return $earned;
    }

    /**
     * Refund any redeemed loyalty points when transitioning an appointment to 'cancelled'.
     */
    public function refundRedeemedPoints(string $previousStatus): int
    {
        $used = (int) ($this->points_used ?? 0);

        if ($used <= 0 || $previousStatus === 'cancelled') {
            return 0;
        }

        if ($this->client) {
            $this->client->increment('loyalty_points', $used);
        }

        return $used;
    }

    protected $appends = [
        'people_ahead',
        'is_my_turn_now',
        'minutes_until_start',
        'estimated_wait_minutes',
    ];

    /**
     * Calculate exact minutes remaining until the appointment starts.
     * Negative if the start time has already passed.
     */
    public function getMinutesUntilStartAttribute(): int
    {
        if (! $this->appointment_date || ! $this->start_time) {
            return 0;
        }

        $dateStr = $this->appointment_date instanceof Carbon
            ? $this->appointment_date->toDateString()
            : Carbon::parse((string) $this->appointment_date)->toDateString();

        $startTimeStr = strlen((string) $this->start_time) === 5
            ? $this->start_time . ':00'
            : (string) $this->start_time;

        $startDateTime = Carbon::parse($dateStr . ' ' . $startTimeStr);
        $diffSeconds = now()->diffInSeconds($startDateTime, false);

        if ($diffSeconds < 0) {
            return (int) floor($diffSeconds / 60);
        }

        if ($diffSeconds > 0) {
            return (int) ceil($diffSeconds / 60);
        }

        return 0;
    }

    /**
     * Determine whether it is strictly the client's turn right now:
     * - status is 'pending' or 'confirmed'
     * - people_ahead === 0
     * - appointment_date is TODAY
     * - minutes_until_start <= 30 (30 minutes or less remaining before start)
     */
    public function getIsMyTurnNowAttribute(): bool
    {
        if (! in_array($this->status, ['pending', 'confirmed'], true)) {
            return false;
        }

        if (! $this->appointment_date || ! $this->start_time) {
            return false;
        }

        $dateStr = $this->appointment_date instanceof Carbon
            ? $this->appointment_date->toDateString()
            : Carbon::parse((string) $this->appointment_date)->toDateString();

        if ($dateStr !== now()->toDateString()) {
            return false;
        }

        return $this->people_ahead === 0 && $this->minutes_until_start <= 30;
    }

    /**
     * Dynamically count earlier active appointments ('pending' or 'confirmed')
     * for the same barber on the same appointment date.
     */
    public function getPeopleAheadAttribute(): int
    {
        if (! in_array($this->status, ['pending', 'confirmed'], true)) {
            return 0;
        }

        if (! $this->barber_id || ! $this->appointment_date || ! $this->start_time) {
            return 0;
        }

        $dateStr = $this->appointment_date instanceof Carbon
            ? $this->appointment_date->toDateString()
            : Carbon::parse((string) $this->appointment_date)->toDateString();

        $startTimeStr = strlen((string) $this->start_time) === 5
            ? $this->start_time . ':00'
            : (string) $this->start_time;

        return static::where('barber_id', $this->barber_id)
            ->whereDate('appointment_date', $dateStr)
            ->whereIn('status', ['pending', 'confirmed'])
            ->where('start_time', '<', $startTimeStr)
            ->where('id', '!=', $this->id)
            ->count();
    }

    /**
     * Calculate total remaining estimated wait minutes for earlier active appointments.
     */
    public function getEstimatedWaitMinutesAttribute(): int
    {
        if (! in_array($this->status, ['pending', 'confirmed'], true)) {
            return 0;
        }

        if (! $this->barber_id || ! $this->appointment_date || ! $this->start_time) {
            return 0;
        }

        $dateStr = $this->appointment_date instanceof Carbon
            ? $this->appointment_date->toDateString()
            : Carbon::parse((string) $this->appointment_date)->toDateString();

        $startTimeStr = strlen((string) $this->start_time) === 5
            ? $this->start_time . ':00'
            : (string) $this->start_time;

        $aheadAppointments = static::with('service:id,duration')
            ->where('barber_id', $this->barber_id)
            ->whereDate('appointment_date', $dateStr)
            ->whereIn('status', ['pending', 'confirmed'])
            ->where('start_time', '<', $startTimeStr)
            ->where('id', '!=', $this->id)
            ->get(['id', 'service_id', 'start_time', 'end_time']);

        $totalMinutes = 0;
        foreach ($aheadAppointments as $appt) {
            if ($appt->start_time && $appt->end_time) {
                try {
                    $duration = Carbon::parse($appt->start_time)->diffInMinutes(Carbon::parse($appt->end_time), false);
                    if ($duration > 0) {
                        $totalMinutes += $duration;
                        continue;
                    }
                } catch (\Throwable $e) {
                    // Fallback to service duration
                }
            }
            $totalMinutes += (int) ($appt->service?->duration ?? 30);
        }

        return (int) $totalMinutes;
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function barber(): BelongsTo
    {
        return $this->belongsTo(Barber::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function review(): HasOne
    {
        return $this->hasOne(Review::class);
    }
}

