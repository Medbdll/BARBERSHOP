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
            'total_price' => (float) $this->total_price,
            'currency' => 'MAD',
            'notes' => $this->notes,
            'review' => $this->whenLoaded('review'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
