import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './PixelTransition.css';

const COLS = 12;
const ROWS = 8;
const TOTAL_BLOCKS = COLS * ROWS;

export function PixelTransition() {
  const location = useLocation();
  const navigate = useNavigate();
  const overlayRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isNavigatingRef = useRef(false);
  const [isActive, setIsActive] = useState(true);
  const [showCenterTag, setShowCenterTag] = useState(true);

  // Dissolve blocks (fade out randomly to reveal the page)
  const dissolveBlocks = (callback?: () => void) => {
    const blocks = blockRefs.current;
    if (!blocks.length) return;

    // Generate random order/delays
    const maxDelay = 0.45; // seconds

    blocks.forEach((block) => {
      if (!block) return;
      const delay = Math.random() * maxDelay;
      block.style.transition = `opacity 0.15s ease ${delay}s`;
      block.style.opacity = '0';
    });

    setShowCenterTag(false);

    const timer = setTimeout(() => {
      setIsActive(false);
      if (callback) callback();
    }, (maxDelay + 0.18) * 1000);

    return () => clearTimeout(timer);
  };

  // Cover blocks (fade in randomly to black before route change)
  const coverBlocks = (onComplete: () => void) => {
    setIsActive(true);
    setShowCenterTag(true);
    const blocks = blockRefs.current;
    if (!blocks.length) {
      onComplete();
      return;
    }

    const maxDelay = 0.32; // seconds
    blocks.forEach((block) => {
      if (!block) return;
      const delay = Math.random() * maxDelay;
      block.style.transition = `opacity 0.12s ease ${delay}s`;
      block.style.opacity = '1';
    });

    setTimeout(() => {
      onComplete();
    }, (maxDelay + 0.15) * 1000);
  };

  // Initial page load: dissolve from full coverage
  useEffect(() => {
    // Start fully covered
    const blocks = blockRefs.current;
    blocks.forEach((block) => {
      if (block) {
        block.style.transition = 'none';
        block.style.opacity = '1';
      }
    });

    const initTimer = setTimeout(() => {
      dissolveBlocks();
    }, 120);

    return () => clearTimeout(initTimer);
  }, []);

  // Listen to clicks on internal navigation links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;

      // Check if external, hash, or target="_blank"
      if (
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('http') && !href.startsWith(window.location.origin) ||
        target.getAttribute('target') === '_blank'
      ) {
        return;
      }

      // Extract internal path
      const url = new URL(target.href, window.location.origin);
      if (url.pathname === location.pathname && url.search === location.search) {
        return; // Already on this page
      }

      // Prevent immediate navigation
      e.preventDefault();
      if (isNavigatingRef.current) return;
      isNavigatingRef.current = true;

      coverBlocks(() => {
        navigate(url.pathname + url.search + url.hash);
        // After navigating, dissolve away
        setTimeout(() => {
          dissolveBlocks(() => {
            isNavigatingRef.current = false;
          });
        }, 80);
      });
    };

    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [location.pathname, location.search, navigate]);

  return (
    <div
      ref={overlayRef}
      className={`pixel-transition-overlay ${isActive ? 'active' : ''}`}
      style={{ display: isActive ? 'grid' : 'none' }}
      aria-hidden="true"
    >
      <div className={`pixel-transition-center ${showCenterTag ? '' : 'hidden'}`}>
        <span className="pixel-brand-tag">PhishRadar</span>
      </div>
      {Array.from({ length: TOTAL_BLOCKS }).map((_, index) => (
        <div
          key={index}
          ref={(el) => {
            blockRefs.current[index] = el;
          }}
          className="pixel-block"
        />
      ))}
    </div>
  );
}
