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
            'id'                     => $this->id,
            'user_id'                => $this->user_id,
            'name'                   => $this->name,
            // Bilingual title (falls back to experience string when not set)
            'title_fr'               => $this->title_fr ?: $this->experience,
            'title_ar'               => $this->title_ar ?: $this->title_fr ?: $this->experience,
            // Bilingual specialty
            'specialty'              => $this->specialty,
            'specialty_fr'           => $this->specialty_fr ?: $this->specialty,
            'specialty_ar'           => $this->specialty_ar ?: $this->specialty_fr ?: $this->specialty,
            'experience'             => $this->experience,
            'rating'                 => (float) $this->rating,
            'reviews_count'          => (int) ($this->reviews_count ?? 0),
            'bio'                    => $this->bio,
            'image_url'              => $this->image_url,
            'is_active'              => (bool) $this->is_active,
            'waiting_clients_count'  => (int) ($this->waiting_clients_count ?? 0),
            'estimated_wait_minutes' => (int) ($this->estimated_wait_minutes ?? 0),
            'waiting_badge'          => $this->waiting_badge ?? null,
            'working_hours'          => $this->whenLoaded('workingHours'),
            'created_at'             => $this->created_at?->toIso8601String(),
        ];
    }
}
