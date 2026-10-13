/* =========================================================================
   Intro / ceremonia de Gular (adaptada del sitio real)
   Secuencia sobre negro: "g" → "No hay solución" → "SINGULAR" → "g" → sitio.
   Silenciosa, scroll bloqueado, una sola vez por sesión. Con reduce-motion o en
   visitas repetidas, entra directo (sin ceremonia).
   ========================================================================= */

const root = document.documentElement;
const intro = document.getElementById("intro");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let seen = false;
try { seen = sessionStorage.getItem("gular-intro") === "1"; } catch {}

function finish(instant) {
  root.classList.add("intro-done");
  document.body.classList.remove("intro-lock");
  if (!intro) return;
  if (instant) { intro.remove(); return; }
  intro.classList.add("is-hidden");
  setTimeout(() => intro.remove(), 1100);
}

if (!intro || reduce || seen) {
  finish(true);
} else {
  try { sessionStorage.setItem("gular-intro", "1"); } catch {}
  document.body.classList.add("intro-lock");
  window.scrollTo(0, 0);

  // [paso, ms desde el inicio]
  const timeline = [
    ["g1", 60],
    ["frase", 1700],
    ["singular", 3700],
    ["g2", 5700],
    ["__done", 6900],
  ];
  for (const [step, at] of timeline) {
    setTimeout(() => {
      if (step === "__done") finish(false);
      else intro.dataset.step = step;
    }, at);
  }
}
