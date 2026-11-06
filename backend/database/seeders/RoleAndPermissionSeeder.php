<?php

namespace Database\Seeders;

use App\Models\Barber;
use App\Models\Gallery;
use App\Models\Service;
use App\Models\User;
use App\Models\WorkingHour;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleAndPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Define Permissions for both web and sanctum guards
        $adminPermissions = [
            'manage users',
            'manage roles',
            'manage services',
            'manage barbers',
            'manage all appointments',
            'view analytics',
            'moderate reviews',
            'export reports',
        ];

        $employePermissions = [
            'view own schedule',
            'update own appointment status',
            'manage own working hours',
            'view assigned clients',
        ];

        $clientPermissions = [
            'book appointment',
            'cancel own appointment',
            'reschedule own appointment',
            'leave review',
            'view loyalty points',
        ];

        $allPermissions = array_unique(array_merge($adminPermissions, $employePermissions, $clientPermissions));

        $guards = ['web', 'sanctum'];

        foreach ($guards as $guard) {
            foreach ($allPermissions as $perm) {
                Permission::firstOrCreate(['name' => $perm, 'guard_name' => $guard]);
            }

            // Roles
            $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => $guard]);
            $adminRole->syncPermissions(Permission::where('guard_name', $guard)->get());

            $employeRole = Role::firstOrCreate(['name' => 'employe', 'guard_name' => $guard]);
            $employeRole->syncPermissions(
                Permission::whereIn('name', $employePermissions)->where('guard_name', $guard)->get()
            );

            $clientRole = Role::firstOrCreate(['name' => 'client', 'guard_name' => $guard]);
            $clientRole->syncPermissions(
                Permission::whereIn('name', $clientPermissions)->where('guard_name', $guard)->get()
            );
        }

        // 3. Seed Default Users with Roles
        // Admin
        $admin = User::firstOrCreate(
            ['email' => 'admin@barbershop.ma'],
            [
                'name' => 'Directeur Général VIP',
                'phone' => '+212 6 00 00 00 01',
                'password' => Hash::make('password123'),
                'loyalty_points' => 999,
            ]
        );
        $admin->syncRoles(['admin']);

        // Employé (Master Barber 1)
        $barberUser1 = User::firstOrCreate(
            ['email' => 'yassine@barbershop.ma'],
            [
                'name' => 'Yassine El Fassi',
                'phone' => '+212 6 11 22 33 44',
                'password' => Hash::make('password123'),
                'loyalty_points' => 100,
            ]
        );
        $barberUser1->syncRoles(['employe']);

        // Employé (Master Barber 2)
        $barberUser2 = User::firstOrCreate(
            ['email' => 'karim@barbershop.ma'],
            [
                'name' => 'Karim Benali',
                'phone' => '+212 6 22 33 44 55',
                'password' => Hash::make('password123'),
                'loyalty_points' => 100,
            ]
        );
        $barberUser2->syncRoles(['employe']);

        // Client
        $client = User::firstOrCreate(
            ['email' => 'client@barbershop.ma'],
            [
                'name' => 'Alexandre De Montmirail',
                'phone' => '+212 6 99 88 77 66',
                'password' => Hash::make('password123'),
                'loyalty_points' => 180,
            ]
        );
        $client->syncRoles(['client']);

        // 4. Seed Barbers
        $barber1 = Barber::updateOrCreate(
            ['user_id' => $barberUser1->id],
            [
                'name' => 'Yassine El Fassi',
                'specialty' => 'Coupes Classiques & Ciseaux',
                'experience' => '12 ans',
                'rating' => 4.9,
                'bio' => 'Maître barbier formé aux rituels traditionnels parisiens et marocains.',
                'image_url' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
                'is_active' => true,
            ]
        );

        $barber2 = Barber::updateOrCreate(
            ['user_id' => $barberUser2->id],
            [
                'name' => 'Karim Benali',
                'specialty' => 'Dégradés Millimétrés & Tracés',
                'experience' => '8 ans',
                'rating' => 5.0,
                'bio' => 'Spécialiste mondial du Skin Fade et du styling moderne urbain.',
                'image_url' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
                'is_active' => true,
            ]
        );

        $barber3 = Barber::firstOrCreate(
            ['name' => 'Mehdi Tazi'],
            [
                'user_id' => null,
                'specialty' => 'Rasage Traditionnel & Serviette Chaude',
                'experience' => '10 ans',
                'rating' => 4.9,
                'bio' => 'L art du rasoir droit et des huiles naturelles d argan.',
                'image_url' => 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
                'is_active' => true,
            ]
        );

        // 5. Seed Working Hours (Mon - Sat 09:30 - 20:30, Sun off)
        foreach ([$barber1, $barber2, $barber3] as $b) {
            for ($day = 0; $day <= 6; $day++) {
                WorkingHour::firstOrCreate(
                    [
                        'barber_id' => $b->id,
                        'day_of_week' => $day,
                    ],
                    [
                        'start_time' => '09:30:00',
                        'end_time' => '20:30:00',
                        'break_start' => '13:00:00',
                        'break_end' => '14:00:00',
                        'is_day_off' => ($day === 0), // Sunday is day off by default
                    ]
                );
            }
        }

        // 6. Seed Services
        $services = [
            [
                'name' => 'Coupe Signature & Shampoing Massant',
                'category' => 'hair',
                'duration' => 35,
                'price' => 150.00,
                'description' => 'Diagnostic morphologique, dégradé de précision au rasoir et coiffage aux cires mates premium.',
                'is_active' => true,
            ],
            [
                'name' => 'Dégradé Américain Skin Fade',
                'category' => 'hair',
                'duration' => 40,
                'price' => 180.00,
                'description' => 'Dégradé à blanc millimétré, contours ultra-nets au rasoir droit et friction tonique.',
                'is_active' => true,
            ],
            [
                'name' => 'Sculpture de Barbe & Rasoir à l Ancienne',
                'category' => 'beard',
                'duration' => 30,
                'price' => 120.00,
                'description' => 'Taillage aux ciseaux et tondeuse, contours nets au rasoir droit et huile nourrissante d argan.',
                'is_active' => true,
            ],
            [
                'name' => 'Rituel Barbe Traditionnelle & Serviette Chaude',
                'category' => 'beard',
                'duration' => 45,
                'price' => 160.00,
                'description' => 'Bain de vapeur aux huiles d eucalyptus, serviettes chaudes successives et rasage d exception.',
                'is_active' => true,
            ],
            [
                'name' => 'Soin Visage Purifiant & Masque Noir Détox',
                'category' => 'care',
                'duration' => 40,
                'price' => 200.00,
                'description' => 'Gommage doux aux extraits naturels, extraction des impuretés, masque au charbon et crème hydratante.',
                'is_active' => true,
            ],
            [
                'name' => 'Le Forfait Royal VIP (Coupe + Barbe + Soin)',
                'category' => 'vip',
                'duration' => 75,
                'price' => 350.00,
                'description' => 'L expérience complète : Coupe sur-mesure, rituel de barbe à la serviette chaude, soin du visage et boisson offerte.',
                'is_active' => true,
            ],
            [
                'name' => 'Le Forfait Marié & Événement Privé',
                'category' => 'vip',
                'duration' => 90,
                'price' => 600.00,
                'description' => 'Privatisation partielle : soin éclat complet, coupe et barbe parfaites, coiffage haute tenue et shooting photo souvenir.',
                'is_active' => true,
            ],
        ];

        foreach ($services as $srv) {
            Service::firstOrCreate(['name' => $srv['name']], $srv);
        }

        // 7. Seed Gallery Items
        $galleryItems = [
            [
                'title' => 'Signature Taper Fade',
                'category' => 'Coupe & Barbe',
                'image_url' => 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&q=80&w=600',
                'is_active' => true,
            ],
            [
                'title' => 'Barbe Sculptée & Précision',
                'category' => 'Barbe Prestige',
                'image_url' => 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=600',
                'is_active' => true,
            ],
            [
                'title' => 'Rituel au Rasoir Droit',
                'category' => 'Rituel Ancien',
                'image_url' => 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=600',
                'is_active' => true,
            ],
        ];

        foreach ($galleryItems as $g) {
            Gallery::firstOrCreate(['title' => $g['title']], $g);
        }

        // 8. Seed Approved Customer Reviews
        $reviews = [
            [
                'client_id' => $client->id,
                'barber_id' => $barber1->id,
                'rating' => 5,
                'comment' => "Une expérience d'orfèvre. Le dégradé est millimétré et le rituel de la serviette chaude aux huiles d'eucalyptus est tout simplement divin.",
                'is_approved' => true,
            ],
            [
                'client_id' => $client->id,
                'barber_id' => $barber2->id,
                'rating' => 5,
                'comment' => "Le meilleur salon de Casablanca sans hésitation. Ponctualité remarquable, ambiance feutrée luxueuse et un coup de ciseaux d'une précision chirurgicale.",
                'is_approved' => true,
            ],
            [
                'client_id' => $client->id,
                'barber_id' => $barber3->id,
                'rating' => 5,
                'comment' => "Le Forfait Royal VIP est à essayer absolument ! Détox du visage, taille de barbe au rasoir droit et coupe impeccable. Bravo à l'équipe.",
                'is_approved' => true,
            ],
        ];

        foreach ($reviews as $rev) {
            \App\Models\Review::firstOrCreate(
                ['client_id' => $rev['client_id'], 'barber_id' => $rev['barber_id'], 'comment' => $rev['comment']],
                $rev
            );
        }
    }
}
