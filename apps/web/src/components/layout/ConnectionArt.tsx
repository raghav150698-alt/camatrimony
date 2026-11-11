"use client";

import { useEffect, useRef, useState } from 'react';

export default function ConnectionArt({variant}: {variant: 'orbit' | 'journey'}) {
  const element = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!element.current) return;
    if (!('IntersectionObserver' in window)) {setReady(true);return;}
    const observer = new IntersectionObserver(entries => {
      if(entries.some(entry => entry.isIntersecting)){setReady(true);observer.disconnect();}
    }, {threshold: .25});
    observer.observe(element.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={element} className={`connection-art connection-${variant}`} data-ready={ready} aria-hidden="true">
    {variant === 'orbit' ? <svg viewBox="0 0 240 240" fill="none"><circle cx="120" cy="120" r="110" stroke="currentColor" strokeOpacity=".18" strokeDasharray="2 9"/><path className="connection-stroke" pathLength="1" d="M120 196C23 196 23 44 120 44C217 44 217 196 120 196Z" stroke="currentColor"/><path className="connection-stroke connection-stroke-second" pathLength="1" d="M44 120C44 23 196 23 196 120C196 217 44 217 44 120Z" stroke="currentColor"/><g className="connection-satellite"><circle cx="120" cy="44" r="5" fill="currentColor"/><circle cx="120" cy="44" r="11" stroke="currentColor" strokeOpacity=".3"/></g><circle className="connection-center" cx="120" cy="120" r="4" fill="currentColor"/></svg>
    : <svg viewBox="0 0 48 360" fill="none" preserveAspectRatio="none"><path d="M24 16V344" stroke="currentColor" strokeOpacity=".2"/><path className="connection-stroke" pathLength="1" d="M24 16C-2 90 50 100 24 180S-2 280 24 344" stroke="currentColor"/><circle className="journey-point journey-point-one" cx="24" cy="16" r="5" fill="currentColor"/><circle className="journey-point journey-point-two" cx="24" cy="180" r="5" fill="currentColor"/><circle className="journey-point journey-point-three" cx="24" cy="344" r="5" fill="currentColor"/></svg>}
  </div>;
}
