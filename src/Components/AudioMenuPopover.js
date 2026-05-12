import React, { useEffect, useRef } from 'react';

/**
 * Anchored popover for the audio button dropdown menus.
 * - Closes on outside click and Escape.
 * - Does NOT stop active playback when opened.
 * - Renders children inline below the trigger.
 *
 * The optional `triggerRef` should point at the entire trigger area
 * (typically the surrounding split-button group). Clicks inside that
 * area do not trigger close — they pass through to the trigger's own
 * onClick handler, which is responsible for toggling open/close state.
 */
export default function AudioMenuPopover({ open, onClose, triggerRef, children }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (ref.current && ref.current.contains(e.target)) return;
      if (triggerRef && triggerRef.current && triggerRef.current.contains(e.target)) return;
      onClose();
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
  }, [open, onClose, triggerRef]);

  if (!open) return null;
  return <div className="audio-menu-popover" ref={ref} role="menu">{children}</div>;
}
