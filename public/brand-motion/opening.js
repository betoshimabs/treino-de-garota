// This runs before the application bundle, including on an offline cold start.
(() => {
  const opening = document.getElementById('app-opening');
  const root = document.getElementById('root');
  const animation = opening.querySelector('[data-opening-animation]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let ready = false;
  let finished = reduced.matches;
  let closing = false;
  const release = () => {
    if (!ready || !finished || closing) return;
    closing = true;
    opening.classList.add('opening-leave');
    setTimeout(() => {
      opening.remove();
      root.removeAttribute('inert');
    }, reduced.matches ? 0 : 300);
  };
  const finish = () => {
    finished = true;
    animation.hidden = true;
    opening.querySelector('[data-opening-poster]').hidden = false;
    release();
  };
  window.addEventListener('brabita-ready', () => { ready = true; release(); });
  const start = () => setTimeout(finish, 2500);
  animation.addEventListener('load', start, { once: true });
  animation.addEventListener('error', finish, { once: true });
  if (reduced.matches) finish();
  else if (animation.complete) animation.naturalWidth ? start() : finish();
  // The WebP plays once and holds its last frame. A stalled decoder must
  // never trap an otherwise ready application.
  setTimeout(finish, 4000);
  setTimeout(() => {
    if (!closing) opening.querySelector('.opening-recovery').hidden = false;
  }, 15000);
  opening.querySelector('button').addEventListener('click', () => location.reload());
})();
