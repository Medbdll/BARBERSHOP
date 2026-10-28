# 💈 BarberShop - Plateforme de Gestion de Rendez-vous

![Laravel](https://img.shields.io/badge/Laravel-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)
![PHP](https://img.shields.io/badge/PHP-8.1+-777BB4?style=for-the-badge&logo=php&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

## 📌 Introduction

**BarberShop** est une application web moderne conçue pour digitaliser et simplifier la prise de rendez-vous au sein d'un salon de coiffure pour hommes. 

La plateforme permet aux **Clients** de consulter en temps réel le catalogue des prestations (coupes, taille de barbe, soins, forfaits VIP), de vérifier les créneaux horaires disponibles des barbiers et de réserver un rendez-vous en quelques clics. Du côté **Administrateur**, elle offre au gérant du salon un tableau de bord complet pour piloter son planning, gérer son équipe, suivre son chiffre d'affaires et fidéliser sa clientèle.

---

## ✨ Fonctionnalités Principales

### 👤 Espace Client
- **Landing Page Interactive :** Présentation du salon, catalogue des services et tarifs, profils des barbiers, galerie photos (Lookbook), avis clients et localisation sur carte interactive.
- **Authentification :** Inscription classique ou rapide via **Google OAuth**, connexion et réinitialisation de mot de passe par email.
- **Booking Stepper (Prise de RDV en 4 étapes) :**
  1. Sélection d'une ou plusieurs prestations (calcul automatique de la durée et du prix total).
  2. Choix d'un barbier spécifique ou option *"N'importe quel barbier disponible"*.
  3. Sélection dynamique (AJAX / Livewire) de la date et du créneau horaire disponible en temps réel sans conflit.
  4. Récapitulatif, ajout de notes spéciales, choix du mode de paiement et confirmation par email.
- **Tableau de Bord Client :**
  - Suivi des rendez-vous à venir (`Confirmé`, `En attente`, `Annulé`) avec options de report ou d'annulation.
  - Export de reçu et ajout direct à **Google Calendar**.
  - Historique des prestations avec bouton **"Réserver à nouveau"** en 1 clic.
  - Système de notation et d'avis (1 à 5 étoiles) après chaque prestation terminée.
  - Suivi du programme de **Points de Fidélité** (ex: 9 coupes réalisées = la 10ème offerte).

### 🛠️ Tableau de Bord Administrateur (Gérant)
- **Statistiques & KPIs (Chart.js) :** Suivi des RDV (jour/semaine/mois), chiffre d'affaires, nouveaux clients, taux d'occupation, taux de *No-Show*, répartition des services les plus demandés et heures de pointe.
- **Gestion du Planning & RDV :**
  - Calendrier interactif global filtrable par barbier et statut.
  - Validation, rejet, modification ou complétion (`Terminé`) des réservations avec notification automatique au client.
  - Ajout manuel de rendez-vous (clients de passage ou appels téléphoniques).
  - Recherche instantanée (AJAX) et export du planning en **PDF / Excel / CSV**.
- **Gestion du Catalogue (CRUD Services) :** Création et modification des prestations, tarifs, durées, catégories et forfaits promotionnels.
- **Gestion de l'Équipe & Horaires :** Gestion des profils barbiers, configuration des horaires d'ouverture par jour, pauses déjeuner et blocage des jours de congé/fériés.
- **Gestion des Clients :** Fiche détaillée client, suivi de l'historique et blocage des comptes en cas d'absences répétées non justifiées (*No-shows* abusifs).
- **Modération & Contenu :** Validation des avis clients avant publication, gestion de la galerie photos (upload multiple) et édition des informations du salon.

### 🌐 Fonctionnalités Transversales
- **Géolocalisation & Cartographie :** Intégration de **Leaflet.js (OpenStreetMap)** avec redirection d'itinéraire vers Google Maps / Waze.
- **Multilingue :** Support complet **Français** et **Arabe (RTL)**.
- **Responsive Design :** Interface Mobile-First adaptée aux smartphones, tablettes et ordinateurs.

---

## 🛠️ Stack Technique

| Catégorie | Technologies utilisées |
| :--- | :--- |
| **Front-End** | HTML5, Blade, Tailwind CSS, JavaScript (Vanilla) / AJAX / Livewire |
| **Back-End** | PHP 8.1+, Laravel (Architecture MVC, Eloquent ORM, Laravel Mail) |
| **Base de Données** | MySQL |
| **Librairies JS** | Chart.js (Statistiques), Leaflet.js & OpenStreetMap (Cartographie) |
| **Conception & Gestion** | Figma (UI/UX), StarUML / Draw.io (UML & ERD), Jira (Agile Scrum), Git & GitHub |

---

## 🗄️ Architecture de la Base de Données

Principales tables relationnelles du projet :
- `users` : Clients et Administrateur (`role`: `client` | `admin`, `loyalty_points`, `status`)
- `barbers` : Informations et spécialités des coiffeurs
- `services` : Catalogue des prestations, prix et durées en minutes
- `appointments` : Rendez-vous planifiés, horaires, prix total et statuts
- `appointment_service` : Table pivot associant un rendez-vous à une ou plusieurs prestations
- `working_hours` : Horaires d'ouverture, pauses et jours de repos par barbier
- `reviews` : Notes et commentaires des clients avec statut de modération
- `galleries` : Photos des réalisations du salon (Lookbook)
- `notifications` : Alertes système et rappels utilisateurs

---

## 🚀 Installation et Démarrage en Local

Suivez ces étapes pour installer et exécuter le projet sur votre machine locale :

### 1. Prérequis
- PHP >= 8.1
- Composer
- Node.js & NPM
- MySQL

### 2. Cloner le projet
```bash
git clone [https://github.com/votre-username/barbershop-booking.git](https://github.com/votre-username/barbershop-booking.git)
cd barbershop-booking
