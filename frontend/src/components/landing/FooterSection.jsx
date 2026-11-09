import React from 'react';
import { ScissorsIcon, PhoneIcon, MailIcon } from '../auth/AuthIcons';
import BrandLogo from '../common/BrandLogo';

export default function FooterSection({ t }) {
  return (
    <footer id="contact" className="bg-gray-950 border-t border-gray-800 text-gray-300">
      {/* Upper Footer: Info, Hours, Location Map */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1: Brand & Bio */}
          <div className="space-y-4">
            <div
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center cursor-pointer group"
            >
              <BrandLogo className="h-14 sm:h-16" />
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              {t.footer.aboutText}
            </p>

            <div className="pt-2 text-xs text-amber-400 font-semibold flex items-center gap-1.5">
              <span>📍</span>
              <span>Casablanca, Gauthier</span>
            </div>
          </div>

          {/* Column 2: Opening Hours */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span>⏱</span>
              <span>{t.footer.hoursTitle}</span>
            </h4>

            <div className="space-y-2.5 text-xs text-gray-400">
              <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 space-y-1">
                <p className="font-semibold text-gray-200">Semaine & Samedi</p>
                <p className="text-amber-400 font-mono font-medium">09:30 — 21:00</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 space-y-1">
                <p className="font-semibold text-gray-200">Dimanche</p>
                <p className="text-amber-400 font-mono font-medium">10:00 — 18:00 (Sur RDV VIP)</p>
              </div>

              <p className="text-[11px] text-gray-500 italic pt-1">
                📱 {t.footer.smsNote}
              </p>
            </div>
          </div>

          {/* Column 3: Contact & Reservation */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span>📞</span>
              <span>{t.footer.locationTitle}</span>
            </h4>

            <div className="space-y-3 text-xs text-gray-400">
              <div className="flex items-start gap-2.5">
                <span className="text-amber-500 mt-0.5">📍</span>
                <span>{t.footer.address}</span>
              </div>

              <div className="flex items-center gap-2.5">
                <PhoneIcon className="w-4 h-4 text-amber-500 shrink-0" />
                <a href="tel:+212522345678" className="hover:text-amber-400 font-mono transition">
                  {t.footer.phone}
                </a>
              </div>

              <div className="flex items-center gap-2.5">
                <MailIcon className="w-4 h-4 text-amber-500 shrink-0" />
                <a href="mailto:contact@berbershop.ma" className="hover:text-amber-400 transition">
                  contact@berbershop.ma
                </a>
              </div>

              <div className="pt-2 flex items-center gap-3 text-gray-400">
                <span className="text-xs">Réseaux :</span>
                <span className="w-7 h-7 rounded-lg bg-gray-900 hover:bg-amber-500 hover:text-gray-950 flex items-center justify-center font-bold text-xs cursor-pointer transition">
                  IG
                </span>
                <span className="w-7 h-7 rounded-lg bg-gray-900 hover:bg-amber-500 hover:text-gray-950 flex items-center justify-center font-bold text-xs cursor-pointer transition">
                  FB
                </span>
                <span className="w-7 h-7 rounded-lg bg-gray-900 hover:bg-amber-500 hover:text-gray-950 flex items-center justify-center font-bold text-xs cursor-pointer transition">
                  TT
                </span>
              </div>
            </div>
          </div>

          {/* Column 4: Embedded Location Map */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span>🗺️</span>
              <span>Plan d'Accès</span>
            </h4>

            <div className="w-full h-44 rounded-2xl overflow-hidden border border-gray-800 shadow-xl relative">
              <iframe
                title="Salon Location Casablanca"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d13296.06979207008!2d-7.6364375!3d33.5928889!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xda7d2e970a259c1%3A0x6b29d91f21db7c82!2sGauthier%2C%20Casablanca%2C%20Morocco!5e0!3m2!1sen!2sma!4v1698500000000!5m2!1sen!2sma"
                width="100%"
                height="100%"
                style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) brightness(85%) contrast(110%)' }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>

              <div className="absolute bottom-2 right-2 px-2 py-1 bg-gray-950/90 rounded text-[10px] font-bold text-amber-400 border border-gray-800">
                Casablanca Gauthier
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Legal / Copyright */}
      <div className="border-t border-gray-900 bg-gray-950/90 py-6 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 {t.footer.rights}</p>
          <div className="flex items-center gap-4 text-[11px] text-gray-400">
            <span className="hover:text-amber-400 cursor-pointer">Mentions Légales</span>
            <span>•</span>
            <span className="hover:text-amber-400 cursor-pointer">Politique de Confidentialité</span>
            <span>•</span>
            <span className="hover:text-amber-400 cursor-pointer">Conditions Générales</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
