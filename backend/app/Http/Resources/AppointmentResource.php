<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AppointmentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'client' => $this->whenLoaded('client', function () {
                return [
                    'id' => $this->client->id,
                    'name' => $this->client->name,
                    'email' => $this->client->email,
                    'phone' => $this->client->phone,
                    'loyalty_points' => $this->client->loyalty_points ?? 0,
                    'profile_photo_url' => $this->client->profile_photo_url,
                ];
            }),
            'client_id' => $this->client_id,
            'barber' => new BarberResource($this->whenLoaded('barber')),
            'barber_id' => $this->barber_id,
            'service' => new ServiceResource($this->whenLoaded('service')),
            'service_id' => $this->service_id,
            'appointment_date' => $this->appointment_date?->format('Y-m-d'),
            'start_time' => substr($this->start_time, 0, 5),
            'end_time' => substr($this->end_time, 0, 5),
            'status' => $this->status,
            'people_ahead' => (int) $this->people_ahead,
            'minutes_until_start' => (int) $this->minutes_until_start,
            'is_my_turn_now' => (bool) $this->is_my_turn_now,
            'estimated_wait_minutes' => (int) $this->estimated_wait_minutes,
            'subtotal_price' => (float) ($this->subtotal_price ?? $this->total_price),
            'points_used' => (int) ($this->points_used ?? 0),
            'discount_amount' => (float) ($this->discount_amount ?? 0),
            'total_price' => (float) $this->total_price,
            'points_earned' => (int) ($this->points_earned ?? 0),
            'points_credited' => (bool) ($this->points_credited ?? false),
            'estimated_points_to_earn' => \App\Models\Appointment::calculateEarnedPointsForAmount((float) $this->total_price),
            'currency' => 'MAD',
            'notes' => $this->notes,
            'review' => $this->whenLoaded('review'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
