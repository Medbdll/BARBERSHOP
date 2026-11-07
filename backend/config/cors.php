<?php

return [

    'paths' => ['api/*',
        'sanctum/csrf-cookie',
        'login',
        'logout',
        'register',
        'forgot-password',
        'reset-password',],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:5173',
        'https://barberoza.shop',
    'https://www.barberoza.shop',
    ],

    'allowed_origins_patterns' => [
        '#.*#', 
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];