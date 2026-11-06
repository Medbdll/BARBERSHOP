<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Barber;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class SampleAppointmentSeeder extends Seeder
{
    public function run(): void
    {
        $client = User::role('client')->first();
        if (! $client) return;

        // Additional sample client users
        $client2 = User::firstOrCreate(
            ['email' => 'mehdi.bennani@gmail.com'],
            ['name' => 'Mehdi Bennani', 'phone' => '+212 6 61 23 45 67', 'password' => bcrypt('password123'), 'loyalty_points' => 240]
        );
        $client2->syncRoles(['client']);

        $client3 = User::firstOrCreate(
            ['email' => 'omar.tazi@outlook.com'],
            ['name' => 'Omar Tazi', 'phone' => '+212 6 70 88 99 00', 'password' => bcrypt('password123'), 'loyalty_points' => 110]
        );
        $client3->syncRoles(['client']);

        $client4 = User::firstOrCreate(
            ['email' => 'hamza.drissi@yahoo.fr'],
            ['name' => 'Hamza Drissi', 'phone' => '+212 6 55 44 33 22', 'password' => bcrypt('password123'), 'loyalty_points' => 320]
        );
        $client4->syncRoles(['client']);

        $clients = [$client, $client2, $client3, $client4];
        $barbers = Barber::all();
        $services = Service::all();

        if ($barbers->isEmpty() || $services->isEmpty()) return;

        $statuses = ['confirmed', 'completed', 'completed', 'pending', 'confirmed', 'no_show', 'cancelled'];
        $times = ['09:45', '10:30', '11:15', '14:30', '15:15', '16:00', '17:30', '18:45', '19:30'];

        $today = Carbon::today();
        $dates = [
            $today->toDateString(),
            $today->copy()->addDay()->toDateString(),
            $today->copy()->addDays(2)->toDateString(),
            $today->copy()->subDays(1)->toDateString(),
            $today->copy()->subDays(2)->toDateString(),
            $today->copy()->subDays(3)->toDateString(),
        ];

        for ($i = 1; $i <= 20; $i++) {
            $cl = $clients[array_rand($clients)];
            $srv = $services->random();
            $brb = $barbers->random();
            $d = $dates[array_rand($dates)];
            $t = $times[array_rand($times)];

            $start = Carbon::parse($d . ' ' . $t);
            $end = $start->copy()->addMinutes($srv->duration);

            Appointment::firstOrCreate(
                [
                    'client_id' => $cl->id,
                    'barber_id' => $brb->id,
                    'appointment_date' => $d,
                    'start_time' => $start->format('H:i'),
                ],
                [
                    'service_id' => $srv->id,
                    'end_time' => $end->format('H:i'),
                    'status' => $statuses[array_rand($statuses)],
                    'total_price' => $srv->price,
                    'notes' => 'Dégradé américain et rituel serviette chaude aux huiles',
                ]
            );
        }
    }
}
