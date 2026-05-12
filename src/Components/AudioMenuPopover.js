import React, { useEffect, useRef } from 'react';

/**
 * Anchored popover for the audio button dropdown menus.
 * - Closes on outside click and Escape.
 * - Does NOT stop active playback when opened.
 * - Renders children inline below the trigger.
 */
export default function AudioMenuPopover({ open, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return <div className="audio-menu-popover" ref={ref} role="menu">{children}</div>;
}
