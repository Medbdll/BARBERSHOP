import React from 'react';
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-4xl my-auto">
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
  );
}
