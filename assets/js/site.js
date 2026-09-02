const menuButton = document.querySelector('[data-menu-button]');
const menu = document.querySelector('[data-menu]');
const header = document.querySelector('[data-header]');
let lastFocused = null;

function setMenu(open) {
  if (!menuButton || !menu) return;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  menu.classList.toggle('is-open', open);
  header?.classList.toggle('menu-active', open);
  document.body.classList.toggle('menu-open', open);
  if (open) {
    lastFocused = document.activeElement;
    menu.querySelector('a')?.focus();
  } else if (lastFocused) {
    lastFocused.focus();
  }
}

if (menuButton && menu) {
  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') setMenu(false);
    if (event.key !== 'Tab' || menuButton.getAttribute('aria-expanded') !== 'true') return;
    const focusable = [...menu.querySelectorAll('a[href]'), menuButton];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 900) setMenu(false); });
}

function updateHeader() { header?.classList.toggle('is-scrolled', window.scrollY > 24); }
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

document.querySelectorAll('details').forEach(detail => {
  detail.addEventListener('toggle', () => {
    if (!detail.open) return;
    document.querySelectorAll('details[open]').forEach(other => { if (other !== detail) other.removeAttribute('open'); });
  });
});

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const heroVideo = document.querySelector('video.hero-video');
if (heroVideo) {
  heroVideo.muted = true;
  if (reducedMotion) {
    heroVideo.pause();
    heroVideo.removeAttribute('autoplay');
  } else {
    const playHeroVideo = () => heroVideo.play().catch(() => {});
    heroVideo.addEventListener('ended', () => {
      heroVideo.currentTime = 0;
      playHeroVideo();
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && heroVideo.paused) playHeroVideo();
    });
    playHeroVideo();
  }
}
const reveals = document.querySelectorAll('[data-reveal]');
if (reducedMotion || !('IntersectionObserver' in window)) reveals.forEach(item => item.classList.add('is-visible'));
else {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
  }), { threshold: .14 });
  reveals.forEach(item => observer.observe(item));
}

const year = document.querySelector('[data-year]');
if (year) year.textContent = new Date().getFullYear();
