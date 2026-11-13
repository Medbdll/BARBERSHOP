<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BarberResource;
use App\Http\Resources\ReviewResource;
use App\Http\Resources\ServiceResource;
use App\Models\Appointment;
use App\Models\Barber;
use App\Models\Gallery;
use App\Models\Review;
use App\Models\Service;
use App\Models\WorkingHour;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class PublicApiController extends Controller
{
    /**
     * GET /api/services
     * Fetch active barber shop services (with optional category filter).
     * Cached for 1 hour.
     */
    public function services(Request $request): JsonResponse
    {
        $category = $request->query('category', 'all');
        $cacheKey = 'public_services_' . ($category ?: 'all');

        $data = Cache::remember($cacheKey, 3600, function () use ($category) {
            $query = Service::where('is_active', true)
                ->select(['id', 'name', 'title_fr', 'title_ar', 'category', 'duration', 'duration_minutes', 'price', 'description', 'description_fr', 'description_ar', 'image_url', 'is_active']);

            if ($category && $category !== 'all') {
                $query->where('category', $category);
            }

            $services = $query->orderBy('price', 'asc')->get();

            return ServiceResource::collection($services)->resolve();
        });

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * GET /api/barbers?date=YYYY-MM-DD
     * Fetch all active barbers with working hours and live queue counter ("Ch7al ba9ilo dyal bnadem").
     */
    public function barbers(Request $request): JsonResponse
    {
        $dateParam = $request->query('date');
        $targetDate = $dateParam ? Carbon::parse($dateParam)->toDateString() : Carbon::today()->toDateString();
        $isToday = $targetDate === Carbon::today()->toDateString();
        $currentTime = Carbon::now()->format('H:i:s');

        $barbers = Barber::where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('user_id')
                  ->orWhereHas('user', function ($uq) {
                      $uq->whereHas('roles', function ($rq) {
                          $rq->whereIn('name', ['employe', 'employee']);
                      });
                  });
            })
            ->select(['id', 'user_id', 'name', 'title_fr', 'title_ar', 'bio', 'specialty', 'specialty_fr', 'specialty_ar', 'experience', 'rating', 'reviews_count', 'image_url', 'is_active'])
            ->with(['workingHours:id,barber_id,day_of_week,start_time,end_time,break_start,break_end,is_day_off'])
            ->orderBy('rating', 'desc')
            ->get();

        // Calculate upcoming / active appointments for each barber on the selected date
        $appointments = Appointment::whereIn('barber_id', $barbers->pluck('id'))
            ->whereDate('appointment_date', $targetDate)
            ->whereIn('status', ['pending', 'confirmed', 'in_progress'])
            ->when($isToday, function ($q) use ($currentTime) {
                $q->where('end_time', '>=', $currentTime);
            })
            ->with('service:id,duration')
            ->orderBy('start_time', 'asc')
            ->get()
            ->groupBy('barber_id');

        foreach ($barbers as $barber) {
            $barberAppts = $appointments->get($barber->id, collect());
            $count = $barberAppts->count();
            $waitMinutes = $barberAppts->sum(function ($appt) {
                return (int) ($appt->service->duration ?? 30);
            });

            $barber->waiting_clients_count = $count;
            $barber->estimated_wait_minutes = $waitMinutes;

            if ($waitMinutes >= 60) {
                $hours = floor($waitMinutes / 60);
                $mins = $waitMinutes % 60;
                $barber->waiting_badge = $mins > 0 ? "{$hours}h" . str_pad($mins, 2, '0', STR_PAD_LEFT) : "{$hours}h";
            } else {
                $barber->waiting_badge = "{$waitMinutes}min";
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => BarberResource::collection($barbers)->resolve(),
            'date' => $targetDate,
        ]);
    }

    /**
     * GET /api/available-slots?barber_id=&date=&duration=
     * Real-time slot calculation accounting for working hours, breaks, and booked appointments.
     */
    public function availableSlots(Request $request): JsonResponse
    {
        $request->validate([
            'barber_id' => ['required', 'exists:barbers,id'],
            'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'duration' => ['nullable', 'integer', 'min:15', 'max:180'],
        ], [
            'date.after_or_equal' => 'Impossible de consulter les disponibilités pour une date passée.',
        ]);

        $barberId = $request->barber_id;
        $date = Carbon::parse($request->date);
        $duration = (int) ($request->duration ?? 30); // in minutes

        $dayOfWeek = $date->dayOfWeek; // 0 (Sun) to 6 (Sat)

        // Find barber's working hours for that day
        $workingHour = WorkingHour::where('barber_id', $barberId)
            ->where('day_of_week', $dayOfWeek)
            ->first();

        if (! $workingHour || $workingHour->is_day_off) {
            return response()->json([
                'status' => 'success',
                'date' => $request->date,
                'barber_id' => $barberId,
                'is_day_off' => true,
                'slots' => [],
                'message' => 'Ce barbier ne travaille pas à cette date.',
            ]);
        }

        $workStart = Carbon::parse($request->date . ' ' . $workingHour->start_time);
        $workEnd = Carbon::parse($request->date . ' ' . $workingHour->end_time);

        $breakStart = $workingHour->break_start ? Carbon::parse($request->date . ' ' . $workingHour->break_start) : null;
        $breakEnd = $workingHour->break_end ? Carbon::parse($request->date . ' ' . $workingHour->break_end) : null;

        // Fetch existing active appointments for the barber on this day
        $bookedAppointments = Appointment::where('barber_id', $barberId)
            ->whereDate('appointment_date', $request->date)
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->get(['start_time', 'end_time']);

        $availableSlots = [];
        $allSlots = [];
        $bookedSlots = [];
        $current = $workStart->copy();
        $now = Carbon::now();

        // Increment in 15-minute steps
        while ($current->copy()->addMinutes($duration)->lte($workEnd)) {
            $slotStart = $current->copy();
            $slotEnd = $current->copy()->addMinutes($duration);
            $slotStr = $slotStart->format('H:i');

            // If date is today, check if slot has already passed
            $isPast = $date->isToday() && $slotStart->lte($now);

            // Check overlap with break time
            $overlapBreak = false;
            if ($breakStart && $breakEnd) {
                if ($slotStart->lt($breakEnd) && $slotEnd->gt($breakStart)) {
                    $overlapBreak = true;
                }
            }

            // Check overlap with booked appointments
            $overlapAppointment = false;
            if (! $overlapBreak) {
                foreach ($bookedAppointments as $appt) {
                    $apptStart = Carbon::parse($request->date . ' ' . $appt->start_time);
                    $apptEnd = Carbon::parse($request->date . ' ' . $appt->end_time);

                    if ($slotStart->lt($apptEnd) && $slotEnd->gt($apptStart)) {
                        $overlapAppointment = true;
                        if (! in_array($slotStr, $bookedSlots)) {
                            $bookedSlots[] = $slotStr;
                        }
                        break;
                    }
                }
            }

            $isAvailable = (! $isPast && ! $overlapBreak && ! $overlapAppointment);

            if ($isAvailable) {
                $availableSlots[] = $slotStr;
            }

            $allSlots[] = [
                'time' => $slotStr,
                'is_available' => $isAvailable,
                'is_past' => $isPast,
                'is_booked' => $overlapAppointment,
                'is_break' => $overlapBreak,
            ];

            $current->addMinutes(15);
        }

        return response()->json([
            'status' => 'success',
            'date' => $request->date,
            'barber_id' => (int) $barberId,
            'duration_minutes' => $duration,
            'slots' => $availableSlots,
            'all_slots' => $allSlots,
            'booked_slots' => $bookedSlots,
        ]);
    }

    /**
     * GET /api/reviews
     * Fetch approved client reviews.
     * Cached for 30 minutes with optimized eager loading.
     */
    public function reviews(): JsonResponse
    {
        $data = Cache::remember('public_approved_reviews', 1800, function () {
            $reviews = Review::where(function ($q) {
                    $q->where('status', 'approved')
                      ->orWhere(function ($sub) {
                          $sub->where('is_approved', true)
                              ->where('status', '!=', 'rejected');
                      });
                })
                ->select(['id', 'user_id', 'client_id', 'barber_id', 'rating', 'comment', 'comment_ar', 'city', 'service_used', 'status', 'is_approved', 'created_at'])
                ->with([
                    'client:id,name,avatar,profile_photo_path',
                    'user:id,name,avatar,profile_photo_path',
                    'barber:id,name',
                ])
                ->orderBy('created_at', 'desc')
                ->limit(20)
                ->get();

            return ReviewResource::collection($reviews)->resolve();
        });

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * GET /api/gallery
     * Fetch lookbook gallery items.
     * Cached for 1 hour.
     */
    public function gallery(): JsonResponse
    {
        $data = Cache::remember('public_gallery_items', 3600, function () {
            return Gallery::where('is_active', true)
                ->select(['id', 'title', 'title_fr', 'title_ar', 'category', 'image_url', 'col_span', 'is_active'])
                ->get();
        });

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }
}

