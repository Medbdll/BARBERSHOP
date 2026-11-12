<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ServiceResource;
use App\Models\Service;
use App\Support\MediaUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class ServiceController extends Controller
{
    /**
     * GET /api/admin/services
     */
    public function index(): JsonResponse
    {
        $services = Service::orderBy('id', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => ServiceResource::collection($services),
        ]);
    }

    /**
     * POST /api/admin/services
     * Create a service with bilingual title/description support.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title_fr' => ['required_without:name', 'nullable', 'string', 'max:255'],
            'title_ar' => ['nullable', 'string', 'max:255'],
            'name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description_fr' => ['nullable', 'string'],
            'description_ar' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'category' => ['required', 'in:hair,beard,care,vip'],
            'duration' => ['sometimes', 'integer', 'min:10', 'max:180'],
            'duration_minutes' => ['sometimes', 'integer', 'min:10', 'max:180'],
            'price' => ['required', 'numeric', 'min:0'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
            'image_url' => ['nullable', 'string', 'max:2048'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        // Harmonize fields
        $titleFr = $data['title_fr'] ?? $data['name'] ?? 'Prestation';
        $data['title_fr'] = $titleFr;
        $data['name'] = $titleFr;
        $data['title_ar'] = $data['title_ar'] ?: $titleFr;

        $descFr = $data['description_fr'] ?? $data['description'] ?? null;
        $data['description_fr'] = $descFr;
        $data['description'] = $descFr;
        $data['description_ar'] = $data['description_ar'] ?: $descFr;

        $duration = (int) ($data['duration_minutes'] ?? $data['duration'] ?? 30);
        $data['duration'] = $duration;
        $data['duration_minutes'] = $duration;

        // Image handling
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('services', 'public');
            $data['image_url'] = $path;
            unset($data['image']);
        } elseif (array_key_exists('image_url', $data)) {
            $data['image_url'] = MediaUrl::toStoragePath($data['image_url']);
        }

        $service = Service::create($data);
        $this->invalidateCache();

        return response()->json([
            'status' => 'success',
            'message' => 'Prestation ajoutée à la carte avec succès.',
            'data' => new ServiceResource($service),
        ], 201);
    }

    /**
     * PUT /api/admin/services/{id}
     * Update a service with bilingual title/description support.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $service = Service::findOrFail($id);

        $data = $request->validate([
            'title_fr' => ['sometimes', 'nullable', 'string', 'max:255'],
            'title_ar' => ['nullable', 'string', 'max:255'],
            'name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description_fr' => ['nullable', 'string'],
            'description_ar' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'category' => ['sometimes', 'in:hair,beard,care,vip'],
            'duration' => ['sometimes', 'integer', 'min:10', 'max:180'],
            'duration_minutes' => ['sometimes', 'integer', 'min:10', 'max:180'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
            'image_url' => ['nullable', 'string', 'max:2048'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['title_fr']) || isset($data['name'])) {
            $titleFr = $data['title_fr'] ?? $data['name'] ?? $service->title_fr;
            $data['title_fr'] = $titleFr;
            $data['name'] = $titleFr;
        }

        if (isset($data['title_ar'])) {
            $data['title_ar'] = $data['title_ar'] ?: ($data['title_fr'] ?? $service->title_fr);
        }

        if (isset($data['description_fr']) || isset($data['description'])) {
            $descFr = $data['description_fr'] ?? $data['description'] ?? $service->description_fr;
            $data['description_fr'] = $descFr;
            $data['description'] = $descFr;
        }

        if (isset($data['duration_minutes']) || isset($data['duration'])) {
            $duration = (int) ($data['duration_minutes'] ?? $data['duration'] ?? $service->duration);
            $data['duration'] = $duration;
            $data['duration_minutes'] = $duration;
        }

        if ($request->hasFile('image')) {
            $oldPath = $service->getRawOriginal('image_url');
            if ($oldPath && ! str_starts_with($oldPath, 'http') && Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
            $data['image_url'] = $request->file('image')->store('services', 'public');
            unset($data['image']);
        } elseif (array_key_exists('image_url', $data)) {
            $data['image_url'] = MediaUrl::toStoragePath($data['image_url']);
        }

        $service->update($data);
        $this->invalidateCache();

        return response()->json([
            'status' => 'success',
            'message' => 'Prestation mise à jour avec succès.',
            'data' => new ServiceResource($service),
        ]);
    }

    /**
     * DELETE /api/admin/services/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $service = Service::findOrFail($id);
        $oldPath = $service->getRawOriginal('image_url');
        if ($oldPath && ! str_starts_with($oldPath, 'http') && Storage::disk('public')->exists($oldPath)) {
            Storage::disk('public')->delete($oldPath);
        }
        $service->delete();
        $this->invalidateCache();

        return response()->json([
            'status' => 'success',
            'message' => 'Prestation supprimée avec succès.',
        ]);
    }

    protected function invalidateCache(): void
    {
        foreach (['all', 'hair', 'beard', 'care', 'vip', null] as $cat) {
            Cache::forget('public_services_' . ($cat ?: 'all'));
        }
    }
}
