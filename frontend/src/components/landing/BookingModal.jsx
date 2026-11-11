import React, { useEffect } from 'react';
import BookingStepper from '../booking/BookingStepper';

export default function BookingModal({
  isOpen,
  onClose,
  preselectedService = null,
  preselectedBarber = null,
  availableServices = [],
  availableBarbers = [],
  onBookingSuccess,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
    >
      {/* Separate backdrop so scroll container does not create a containing block trapping fixed/sticky children */}
      <div
        className="fixed inset-0 bg-[#070B11]/95 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Full-viewport scrollable wrapper */}
      <div className="fixed inset-0 overflow-y-auto overscroll-contain">
        <div
          className="min-h-full w-full"
          onClick={(e) => {
            if (e.target === e.currentTarget && onClose) {
              onClose();
            }
          }}
        >
          <BookingStepper
            onClose={onClose}
            initialService={preselectedService}
            initialBarber={preselectedBarber}
            availableServices={availableServices}
            availableBarbers={availableBarbers}
            onBookingSuccess={onBookingSuccess}
          />
        </div>
      </div>
    </div>
  );
}
