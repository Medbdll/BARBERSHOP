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
        $user = $this->user ?: $this->client;
        $status = $this->status ?: ($this->is_approved ? 'approved' : 'pending');

        return [
            'id'             => $this->id,
            'user_id'        => $this->user_id ?: $this->client_id,
            'client_id'      => $this->client_id ?: $this->user_id,
            'barber_id'      => $this->barber_id,
            'appointment_id' => $this->appointment_id,
            'client_name'    => $user?->name ?? 'Client VIP',
            'client_avatar'  => $user?->avatar ?: $user?->profile_photo_url,
            'user'           => $user ? [
                'id'     => $user->id,
                'name'   => $user->name,
                'avatar' => $user->avatar ?: $user->profile_photo_url,
            ] : null,
            'barber_name'    => $this->barber?->name,
            'barber'         => $this->barber ? [
                'id'   => $this->barber->id,
                'name' => $this->barber->name,
            ] : null,
            'rating'         => (int) $this->rating,
            'comment'        => $this->comment,
            'comment_ar'     => $this->comment_ar,
            'city'           => $this->city,
            'service_used'   => $this->service_used,
            'status'         => $status,
            'is_approved'    => $status === 'approved',
            'created_at'     => $this->created_at?->diffForHumans() ?? $this->created_at?->toIso8601String(),
        ];
    }
}
