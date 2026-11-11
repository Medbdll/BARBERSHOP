<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
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
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'loyalty_points' => $this->loyalty_points ?? 0,
            'google_id' => $this->google_id,
            'avatar' => $this->avatar,
            'status' => $this->status ?? 'active',
            'profile_photo_url' => $this->avatar ?: $this->profile_photo_url,
            'roles' => $this->relationLoaded('roles')
                ? $this->roles->pluck('name')
                : $this->getRoleNames(),
            'permissions' => $this->relationLoaded('permissions')
                ? $this->permissions->pluck('name')
                : ($this->relationLoaded('roles')
                    ? $this->roles->flatMap->permissions->pluck('name')->unique()->values()
                    : $this->getAllPermissions()->pluck('name')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
