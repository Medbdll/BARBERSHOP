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
              <span>{t.footer.city || 'Casablanca, Gauthier'}</span>
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
                <p className="font-semibold text-gray-200">{t.footer.weekdaysTitle}</p>
                <p className="text-amber-400 font-mono font-medium">{t.footer.weekdaysHours}</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 space-y-1">
                <p className="font-semibold text-gray-200">{t.footer.sundayTitle}</p>
                <p className="text-amber-400 font-mono font-medium">{t.footer.sundayHours}</p>
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
                <a href="tel:+212624818865" className="hover:text-amber-400 font-mono transition">
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
                <span className="text-xs">{t.footer.socials}</span>
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
              <span>{t.footer.mapTitle}</span>
            </h4>

            <div className="w-full h-44 rounded-2xl overflow-hidden border border-gray-800 shadow-xl relative">
              <iframe
                title="Salon Location Casablanca"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d582.615163559737!2d-2.7336259035608164!3d34.94449749208406!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd7797002921f3ff%3A0xb0e6045554a69b!2z8J-SiFpPTkUgTUFUSfCfkojwn5KH4oCN4pmC77iP!5e0!3m2!1sen!2sma!4v1794255502566!5m2!1sen!2sma" 
                width="100%"
                height="100%"
                style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) brightness(85%) contrast(110%)' }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>

              <div className="absolute bottom-2 right-2 px-2 py-1 bg-gray-950/90 rounded text-[10px] font-bold text-amber-400 border border-gray-800">
                {t.footer.city || 'Nador, Morocco'}
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
            <span className="hover:text-amber-400 cursor-pointer">{t.footer.legalNotice}</span>
            <span>•</span>
            <span className="hover:text-amber-400 cursor-pointer">{t.footer.privacyPolicy}</span>
            <span>•</span>
            <span className="hover:text-amber-400 cursor-pointer">{t.footer.termsOfService}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
