<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BarberResource extends JsonResource
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
            'user_id' => $this->user_id,
            'name' => $this->name,
            'specialty' => $this->specialty,
            'experience' => $this->experience,
            'rating' => (float) $this->rating,
            'bio' => $this->bio,
            'image_url' => $this->image_url,
            'is_active' => (bool) $this->is_active,
            'waiting_clients_count' => (int) ($this->waiting_clients_count ?? 0),
            'estimated_wait_minutes' => (int) ($this->estimated_wait_minutes ?? 0),
            'waiting_badge' => $this->waiting_badge ?? null,
            'working_hours' => $this->whenLoaded('workingHours'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
