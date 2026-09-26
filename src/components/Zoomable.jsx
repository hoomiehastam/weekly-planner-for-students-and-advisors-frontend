import { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { toFaDigits } from '../utils/jalali';

const STEP = 0.25;

function clamp(z, lo, hi) {
  return Math.min(hi, Math.max(lo, Math.round(z * 100) / 100));
}

export default function Zoomable({ children, className, minZoom = 0.5, maxZoom = 4, step = STEP }) {
  const frameRef = useRef(null);
  const innerRef = useRef(null);
  const [baseWidth, setBaseWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const lastTapRef = useRef(0);
  const pinchRef = useRef({ d0: 0, z0: 1 });
  const pointersRef = useRef(new Map());
  const clampZ = (z) => clamp(z, minZoom, maxZoom);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => setBaseWidth(Math.max(1, frame.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(frame);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner || !baseWidth) return;
    inner.style.width = `${baseWidth}px`;
  }, [baseWidth]);

  function onWheel(e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom((z) => clamp(z + (e.deltaY < 0 ? step : -step)));
  }

  function onPointerDown(e) {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      pinchRef.current = {
        d0: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        z0: zoom,
      };
    }
  }

  function onPointerMove(e) {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ref = pinchRef.current;
      if (ref.d0 > 0) {
        const ratio = d / ref.d0;
        setZoom((z) => clamp(ref.z0 * ratio));
      }
    }
  }

  function onPointerUp(e) {
    pointersRef.current.delete(e.pointerId);
  }

  function onFrameClick(e) {
    if (e.detail !== 2) return;
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      setZoom((z) => (Math.abs(z - 1) < 0.05 ? clamp(maxZoom > 1 ? 2 : 1) : clamp(1)));
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }

  const effectiveZoom = clampZ(zoom);

  return (
    <div className={`zoom-wrap ${className || ''}`}>
      <div className="zoom-toolbar">
        <span className="zoom-label">🔍</span>
        <button type="button" className="zoom-btn" onClick={() => setZoom(clamp(zoom - step))} aria-label="کوچک‌تر">−</button>
        <span className="zoom-value">{toFaDigits(Math.round(effectiveZoom * 100))}٪</span>
        <button type="button" className="zoom-btn" onClick={() => setZoom(clamp(zoom + step))} aria-label="بزرگ‌تر">+</button>
        {effectiveZoom !== 1 && (
          <button type="button" className="zoom-btn zoom-reset" onClick={() => setZoom(1)}>↺</button>
        )}
      </div>
      <div
        className="zoom-frame"
        ref={frameRef}
        onWheel={onWheel}
        onClick={onFrameClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{ touchAction: 'pan-x pan-y' }}
      >
        <div
          className="zoom-inner"
          ref={innerRef}
          style={{ zoom: effectiveZoom }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}