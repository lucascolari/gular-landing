/* =========================================================================
   Fondo espacio/universo en 3D (Three.js) — versión cinematográfica
   - Starfield en varias profundidades, con color y titileo por estrella.
   - Nebulosa/galaxia con filamentos (domain warping) + núcleo cálido.
   - Estrellas fugaces ocasionales.
   - La cámara viaja hacia el universo según el scroll.
   - Optimizado: menos partículas en móvil, pixelRatio acotado, pausa oculta,
     y respeto por prefers-reduced-motion.
   ========================================================================= */
import * as THREE from "three";

const root = document.documentElement;
const canvas = document.getElementById("space");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function disableWebGL() {
  root.setAttribute("data-webgl", "off");
  if (canvas) canvas.remove();
}

if (reduceMotion) disableWebGL();
else init();

function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  } catch (e) { disableWebGL(); return; }
  if (!renderer.getContext()) { disableWebGL(); return; }

  const isMobile = window.matchMedia("(max-width: 860px)").matches;
  const maxDPR = isMobile ? 1.5 : 2;
  const dpr = Math.min(window.devicePixelRatio || 1, maxDPR);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.autoClear = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.z = 1;

  /* ---------------- Nebulosa / galaxia (shader de filamentos) ------------- */
  const nebUniforms = {
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uAspect: { value: window.innerWidth / window.innerHeight },
  };
  const nebula = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false, transparent: true,
      uniforms: nebUniforms,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }`,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime, uScroll, uAspect;

        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p){
          vec2 i=floor(p), f=fract(p);
          float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
          vec2 u=f*f*(3.-2.*f);
          return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;
        }
        float fbm(vec2 p){
          float v=0.0, a=0.5;
          mat2 m=mat2(1.6,1.2,-1.2,1.6);
          for(int i=0;i<6;i++){ v+=a*noise(p); p=m*p; a*=0.5; }
          return v;
        }
        void main(){
          vec2 uv=vUv;
          vec2 p=(uv-0.5); p.x*=uAspect;
          float t=uTime*0.012;
          p += vec2(0.03*t, 0.35*uScroll);

          // Domain warping -> filamentos de polvo estelar
          vec2 q=vec2(fbm(p*1.6+t), fbm(p*1.6+vec2(5.2,1.3)));
          vec2 r=vec2(fbm(p*1.6+2.0*q+vec2(1.7,9.2)), fbm(p*1.6+2.0*q+vec2(8.3,2.8)-t));
          float f=fbm(p*1.6+3.0*r);
          float density=smoothstep(0.42,1.0,f);

          // Paleta de espacio real: negro + polvo desaturado (rosa/teal/ámbar). Sin azul dominante.
          vec3 base=vec3(0.005,0.006,0.013);
          vec3 teal=vec3(0.05,0.13,0.14);
          vec3 rose=vec3(0.26,0.09,0.15);
          vec3 gold=vec3(0.24,0.17,0.09);

          vec3 col=base;
          col=mix(col, teal, smoothstep(0.30,0.80,r.x)*0.7);
          col=mix(col, rose, smoothstep(0.40,0.95,q.y)*0.7);
          col += gold*pow(density,2.0)*0.45;

          // Núcleo galáctico cálido, descentrado
          vec2 d2=vec2((uv.x-0.62)*uAspect, uv.y-0.34);
          float glow=exp(-dot(d2,d2)*5.0);
          col += vec3(0.55,0.46,0.36)*glow*0.7;

          // Viñeta para legibilidad del contenido
          float d=distance(uv, vec2(0.5));
          float vig=smoothstep(1.05,0.22,d);

          float alpha=clamp(density*0.62 + glow*0.55, 0.0, 1.0)*vig;
          gl_FragColor=vec4(col, alpha);
        }
      `,
    })
  );
  nebula.frustumCulled = false;
  scene.add(nebula);

  /* ---------------- Starfield (shader propio: color + titileo) ------------ */
  const STAR_COUNT = isMobile ? 2600 : 6500;
  const pos = new Float32Array(STAR_COUNT * 3);
  const col = new Float32Array(STAR_COUNT * 3);
  const siz = new Float32Array(STAR_COUNT);
  const pha = new Float32Array(STAR_COUNT);
  const SPREAD = 90;
  const c = new THREE.Color();
  for (let i = 0; i < STAR_COUNT; i++) {
    pos[i*3+0] = (Math.random() - 0.5) * SPREAD;
    pos[i*3+1] = (Math.random() - 0.5) * SPREAD;
    pos[i*3+2] = -Math.random() * 260; // profundidad
    // Colores estelares reales: mayoría blanco cálido; algunas azuladas o ámbar.
    const r = Math.random();
    if (r < 0.7) c.setHSL(0.09, 0.15, 0.9 - Math.random()*0.25);      // blanco cálido
    else if (r < 0.88) c.setHSL(0.6, 0.35, 0.85);                      // azul-blanca
    else c.setHSL(0.07, 0.6, 0.72);                                    // ámbar
    col[i*3+0] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
    siz[i] = (Math.random() ** 3) * 2.4 + 0.5; // mayoría chicas, pocas grandes
    pha[i] = Math.random() * Math.PI * 2;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  starGeo.setAttribute("aSize", new THREE.BufferAttribute(siz, 1));
  starGeo.setAttribute("aPhase", new THREE.BufferAttribute(pha, 1));

  const starMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uDpr: { value: dpr }, uH: { value: window.innerHeight } },
    vertexShader: `
      attribute vec3 aColor; attribute float aSize; attribute float aPhase;
      uniform float uTime, uDpr, uH;
      varying vec3 vColor; varying float vTw;
      void main(){
        vColor=aColor;
        vTw=0.6+0.4*sin(uTime*1.6+aPhase); // titileo
        vec4 mv=modelViewMatrix*vec4(position,1.0);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=aSize*uDpr*(uH*0.08)/max(-mv.z,0.001);
      }
    `,
    fragmentShader: `
      precision mediump float;
      varying vec3 vColor; varying float vTw;
      void main(){
        float d=length(gl_PointCoord-0.5);
        float core=smoothstep(0.5,0.0,d);
        float halo=smoothstep(0.5,0.15,d)*0.5;
        float a=(core+halo)*vTw;
        if(a<0.01) discard;
        gl_FragColor=vec4(vColor, a);
      }
    `,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  scene.add(stars);

  /* ---------------- Estrellas fugaces ------------------------------------- */
  const meteorMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0, blending: THREE.AdditiveBlending, vertexColors: true });
  const meteorGeo = new THREE.BufferGeometry();
  meteorGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
  const mc = new Float32Array([1,0.95,0.85, 1,0.95,0.85]); // head bright, tail set per-spawn
  meteorGeo.setAttribute("color", new THREE.BufferAttribute(mc, 3));
  const meteor = new THREE.Line(meteorGeo, meteorMat);
  meteor.frustumCulled = false;
  scene.add(meteor);
  let meteorT = -1, meteorNext = 3 + Math.random() * 6, meteorFrom = new THREE.Vector3(), meteorDir = new THREE.Vector3();

  function spawnMeteor() {
    meteorT = 0;
    const zBase = camera.position.z - 40;
    meteorFrom.set((Math.random() - 0.3) * 60, 20 + Math.random() * 20, zBase);
    meteorDir.set(-18 - Math.random() * 14, -14 - Math.random() * 10, 0);
  }

  /* ---------------- Scroll + parallax ------------------------------------- */
  let scrollP = 0, tX = 0, tY = 0, cX = 0, cY = 0;
  function onScroll(){
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollP = max > 0 ? window.scrollY / max : 0;
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("pointermove", (e) => {
    tX = (e.clientX / window.innerWidth - 0.5) * 2;
    tY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    nebUniforms.uAspect.value = window.innerWidth / window.innerHeight;
    starMat.uniforms.uH.value = window.innerHeight;
  }, { passive: true });

  /* ---------------- Loop -------------------------------------------------- */
  const clock = new THREE.Clock();
  let running = true, first = false;
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) { clock.start(); loop(); }
  });

  function loop(){
    if (!running) return;
    const t = clock.getElapsedTime();
    const dt = Math.min(clock.getDelta(), 0.05);

    cX += (tX - cX) * 0.04; cY += (tY - cY) * 0.04;
    camera.position.x = cX * 1.4;
    camera.position.y = -cY * 1.0;
    camera.position.z = 1 - scrollP * 150; // viaje por el universo
    stars.rotation.z = t * 0.008;
    camera.lookAt(0, 0, camera.position.z - 10);

    nebUniforms.uTime.value = t;
    nebUniforms.uScroll.value = scrollP;
    starMat.uniforms.uTime.value = t;

    // Estrella fugaz
    if (meteorT < 0) { meteorNext -= dt; if (meteorNext <= 0) { spawnMeteor(); meteorNext = 6 + Math.random() * 9; } }
    if (meteorT >= 0) {
      meteorT += dt;
      const life = 1.1;
      const k = meteorT / life;
      if (k >= 1) { meteorT = -1; meteorMat.opacity = 0; }
      else {
        const head = meteorFrom.clone().addScaledVector(meteorDir, meteorT);
        const tail = head.clone().addScaledVector(meteorDir, -0.14);
        const a = meteorGeo.attributes.position.array;
        a[0]=head.x; a[1]=head.y; a[2]=head.z; a[3]=tail.x; a[4]=tail.y; a[5]=tail.z;
        meteorGeo.attributes.position.needsUpdate = true;
        meteorMat.opacity = Math.sin(k * Math.PI); // fade in/out
      }
    }

    renderer.render(scene, camera);
    if (!first) { first = true; window.dispatchEvent(new Event("space:ready")); }
    requestAnimationFrame(loop);
  }
  loop();
}
