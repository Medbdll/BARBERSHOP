<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReviewResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'client_name'  => $this->client?->name ?? 'Client VIP',
            'client_avatar'=> $this->client?->profile_photo_url,
            'barber_name'  => $this->barber?->name,
            'rating'       => $this->rating,
            'comment'      => $this->comment,
            'comment_ar'   => $this->comment_ar,
            'city'         => $this->city,
            'service_used' => $this->service_used,
            'is_approved'  => (bool) $this->is_approved,
            'created_at'   => $this->created_at?->diffForHumans() ?? $this->created_at?->toIso8601String(),
        ];
    }
}
