/* =========================================================================
   Interacción de la landing de Gular
   - Navegación (scroll + menú móvil), reveals.
   - Carrusel de proyectos por scroll (pin horizontal en desktop; swipe nativo
     en móvil / reduce-motion).
   - Carga diferida de videos y formulario de contacto (mailto provisorio).
   (La intro/ceremonia se maneja en intro.js.)
   ========================================================================= */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Año del footer ---------- */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------- Navegación: la "g" (isotipo) abre/cierra el menú ---------- */
const nav = document.getElementById("nav");
const menuBtn = document.getElementById("menuBtn");
const menuPanel = document.getElementById("menuPanel");

window.addEventListener("scroll", () => {
  if (window.scrollY > 10) nav.setAttribute("data-scrolled", "");
  else nav.removeAttribute("data-scrolled");
}, { passive: true });

function setMenu(open) {
  menuPanel.toggleAttribute("data-open", open);
  menuPanel.setAttribute("aria-hidden", String(!open));
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
}
menuBtn.addEventListener("click", () => setMenu(!menuPanel.hasAttribute("data-open")));
menuPanel.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

/* ---------- Reveals al entrar en viewport ---------- */
const revealIO = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add("is-in"); revealIO.unobserve(e.target); }
    }
  },
  { threshold: 0.18 }
);
document.querySelectorAll(".reveal").forEach((el) => revealIO.observe(el));

/* ---------- Carga diferida + play/pause de videos ---------- */
const videoIO = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      const v = e.target;
      if (e.isIntersecting) {
        if (!v.src && v.dataset.src) v.src = v.dataset.src;
        const p = v.play();
        if (p && p.catch) p.catch(() => {}); // ignora bloqueos de autoplay
      } else {
        v.pause();
      }
    }
  },
  { threshold: 0.25 }
);
document.querySelectorAll(".work__media video").forEach((v) => videoIO.observe(v));

/* ---------- Carrusel de proyectos por scroll ---------- */
const projects = document.getElementById("proyectos");
const track = document.getElementById("track");
const progressBar = document.getElementById("trackProgress");

// En móvil o con reduce-motion: carrusel nativo (swipe), sin pin.
const useNative = window.matchMedia("(max-width: 860px)").matches || reduceMotion;

if (useNative) {
  projects.setAttribute("data-native", "");
} else {
  let overflow = 0;
  const works = [...track.querySelectorAll(".work")];

  function measure() {
    // Distancia horizontal que el track debe recorrer.
    overflow = Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
    // El bloque mide alto = una pantalla + lo que haya que desplazar horizontal.
    projects.style.height = window.innerHeight + overflow + "px";
    update();
  }

  function update() {
    const rect = projects.getBoundingClientRect();
    const total = projects.offsetHeight - window.innerHeight;
    const scrolled = Math.min(Math.max(-rect.top, 0), total);
    const progress = total > 0 ? scrolled / total : 0;
    track.style.transform = `translate3d(${-overflow * progress}px,0,0)`;
    if (progressBar) progressBar.style.width = progress * 100 + "%";

    // Las piezas escalan/aclaran a medida que se acercan al centro de la pantalla.
    const mid = window.innerWidth / 2;
    for (const w of works) {
      const r = w.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mid) / window.innerWidth; // 0 = centrada
      const k = Math.max(0, 1 - d * 1.6);
      w.style.transform = `scale(${0.9 + k * 0.1})`;
      w.style.opacity = (0.4 + k * 0.6).toFixed(3);
    }
  }

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
  // Re-medir cuando el layout se estabiliza (fuentes/imágenes).
  window.addEventListener("load", measure);
  measure();
}

/* ---------- Formulario de contacto (provisorio: abre el correo prellenado) ---------- */
/* TODO: cuando haya endpoint (Formspree u otro), reemplazar por un fetch/POST. */
const CONTACT_EMAIL = "hola@gular.com"; // TODO: correo real de Gular
const form = document.getElementById("contactForm");
const note = document.getElementById("formNote");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const nombre = form.nombre.value.trim();
  const email = form.email.value.trim();
  const mensaje = form.mensaje.value.trim();

  if (!nombre || !email || !mensaje) {
    note.textContent = "Completá todos los campos para enviar tu consulta.";
    note.dataset.state = "err";
    return;
  }

  const asunto = encodeURIComponent(`Consulta de ${nombre} · Gular`);
  const cuerpo = encodeURIComponent(`${mensaje}\n\n— ${nombre}\n${email}`);
  window.location.href = `mailto:${CONTACT_EMAIL}?subject=${asunto}&body=${cuerpo}`;

  note.textContent = "Abrimos tu correo con la consulta lista para enviar. ¡Gracias!";
  note.dataset.state = "ok";
  form.reset();
});
