<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $titleFr = $this->title_fr ?: $this->name;
        $titleAr = $this->title_ar ?: $titleFr;
        $descFr = $this->description_fr ?: $this->description;
        $descAr = $this->description_ar ?: $descFr;
        $duration = (int) ($this->duration_minutes ?: ($this->duration ?: 30));

        return [
            'id' => $this->id,
            'name' => $this->name ?: $titleFr,
            'title_fr' => $titleFr,
            'title_ar' => $titleAr,
            'category' => $this->category,
            'duration' => $duration,
            'duration_minutes' => $duration,
            'price' => (float) $this->price,
            'currency' => 'MAD',
            'description' => $this->description ?: $descFr,
            'description_fr' => $descFr,
            'description_ar' => $descAr,
            'image_url' => $this->image_url,
            'is_active' => (bool) $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
