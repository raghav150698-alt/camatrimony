"use client";

import React from "react";

export default function WhatsAppFAB() {
  const phoneNumber = "916281369478";
  const message = encodeURIComponent(
    "Hello! I am interested in CA Matrimony BNCN services. Please guide me."
  );
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      // Inline position guarantees bottom-right even if package utilities are not scanned by the app Tailwind pipeline
      style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 50 }}
      className="group fixed bottom-6 right-6 z-50 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white rounded-full p-4 shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300 hover:scale-105 cursor-pointer"
      aria-label="Contact us on WhatsApp"
    >
      {/* Soft pulse — kept behind the icon */}
      <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-40 animate-ping -z-10" />

      <svg
        className="w-6 h-6 sm:w-7 sm:h-7 relative z-10"
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.588 1.485 5.407 1.486 5.417.002 9.825-4.403 9.828-9.828.002-2.628-1.022-5.1-2.885-6.963C17.13 1.983 14.654 1.05 12.02 1.05c-5.424 0-9.832 4.403-9.835 9.828-.001 1.902.497 3.76 1.44 5.396l-.999 3.65 3.734-.979zM18.23 15.2c-.34-.17-2.01-.99-2.321-1.1-1.1-.34-2-.17-2.321.34-.34.34-.736.88-1.019 1.1-.255.255-.51.283-.85.113-1.189-.595-2.067-1.19-2.887-2.58-.227-.396-.028-.623.17-.822.17-.17.34-.396.51-.595.17-.17.227-.283.34-.482.113-.2.056-.396-.028-.566-.084-.17-.736-1.77-.991-2.41-.255-.623-.51-.539-.708-.539-.17-.028-.396-.028-.595-.028-.2 0-.51.084-.793.368-.283.283-1.1.991-1.1 2.437s1.019 2.861 1.161 3.06c.142.2 2.011 3.06 4.872 4.292 2.861 1.232 2.861.822 3.37.765.51-.057 2.01-.822 2.294-1.587.283-.765.283-1.416.2-1.558-.085-.142-.312-.227-.652-.397z" />
      </svg>
      <span className="relative z-10 max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out whitespace-nowrap text-sm font-semibold ml-0 group-hover:ml-2">
        Chat with Us
      </span>
    </a>
  );
}
