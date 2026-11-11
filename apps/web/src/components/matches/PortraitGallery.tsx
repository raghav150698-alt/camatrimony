"use client";

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, LockKeyhole, X } from 'lucide-react';
import { LOCKED_PHOTO_BLUR_CLASS } from '@/lib/profile-display';

export default function PortraitGallery({photos, name, visible}: {photos: string[]; name: string; visible: boolean}) {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const selected = Math.min(index, photos.length - 1);
  const photo = photos[selected] || '/avatar-placeholder.svg';
  const move = (direction: number) => setIndex((selected + direction + photos.length) % photos.length);
  useEffect(() => {
    if (!expanded || !visible || !dialog.current) return;
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => { if (element.open) element.close(); document.body.style.overflow = previousOverflow; };
  }, [expanded, visible]);
  const fallback = (event: React.SyntheticEvent<HTMLImageElement>) => {
    if (!event.currentTarget.src.endsWith('/avatar-placeholder.svg')) event.currentTarget.src = '/avatar-placeholder.svg';
  };
  return <div className="portrait-gallery">
    <div className="portrait-gallery-stage">
      <button type="button" className="portrait-open" disabled={!visible} onClick={() => setExpanded(true)} aria-label={`View full photo of ${name}`}>
        <img src={photo} alt={`${name}, photo ${selected + 1}`} className={!visible ? LOCKED_PHOTO_BLUR_CLASS : ''} onError={fallback}/>
      </button>
      <div className="portrait-gallery-caption"><span>{String(selected + 1).padStart(2,'0')} <span>/ {String(photos.length).padStart(2,'0')}</span></span>{visible ? <button type="button" onClick={() => setExpanded(true)}><Expand size={14}/>Full photo</button> : <span><LockKeyhole size={13}/>Private preview</span>}</div>
    </div>
    {photos.length > 1 && <div className="portrait-filmstrip" aria-label="Profile photos">{photos.map((src, i) => <button type="button" key={`${src}-${i}`} aria-label={`View photo ${i + 1}`} aria-pressed={selected === i} onClick={() => setIndex(i)}><img src={src} alt="" className={!visible ? LOCKED_PHOTO_BLUR_CLASS : ''} onError={fallback}/></button>)}</div>}
    <dialog ref={dialog} className="portrait-lightbox" aria-label={`Photos of ${name}`} onClose={() => setExpanded(false)} onCancel={() => setExpanded(false)} onClick={event => { if(event.target === event.currentTarget) setExpanded(false); }} onKeyDown={event => { if(event.key === 'ArrowRight'){event.preventDefault();move(1);} if(event.key === 'ArrowLeft'){event.preventDefault();move(-1);} }}>
      <div className="portrait-lightbox-toolbar"><p>{name}<span>Photo {selected + 1} of {photos.length}</span></p><button type="button" autoFocus onClick={() => setExpanded(false)} aria-label="Close photo viewer"><X size={22}/></button></div>
      <div className="portrait-lightbox-image"><img src={photo} alt={`${name}, photo ${selected + 1}`} className={!visible ? LOCKED_PHOTO_BLUR_CLASS : ''} onError={fallback}/></div>
      {photos.length > 1 && <div className="portrait-lightbox-controls"><button type="button" onClick={() => move(-1)} aria-label="Previous photo"><ChevronLeft size={21}/></button><span aria-live="polite">{selected + 1} / {photos.length}</span><button type="button" onClick={() => move(1)} aria-label="Next photo"><ChevronRight size={21}/></button></div>}
    </dialog>
  </div>;
}
