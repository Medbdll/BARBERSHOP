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
        'https://idvwvtpnflheodj9xkexkjyi.51.170.140.38.sslip.io',
    ],

    'allowed_origins_patterns' => [
        '#.*#', // <-- Hadi kat-khllih y-qbel ay domain dynamique m3a credentials bla ma y-blocqui
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];