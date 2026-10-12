# Gular — Landing provisoria

Landing de una sola página para **Gular**, pensada como sitio provisorio mientras
se termina el sitio real (Next.js). Es una experiencia visual con fondo de
universo en 3D, carrusel de proyectos por scroll y la identidad de marca de Gular.

## Stack
- HTML + CSS + JavaScript (sin build step).
- [Three.js](https://threejs.org/) (por CDN, versión fijada) para el fondo 3D.
- Tipografías de marca: **Archivo** (titulares) + **Inter** (texto), vía Google Fonts.
- Pensada para publicarse como sitio estático (ej. GitHub Pages).

## Cómo verla en local
Al usar módulos ES e `importmap`, hay que servirla por HTTP (no abrir el `index.html`
con doble clic). Desde esta carpeta:

```bash
npx --yes serve .
# o
python -m http.server 8080
```

Luego abrir la URL que indique (ej. http://localhost:3000 o :8080).

## Estructura
```
index.html
assets/
  css/styles.css        · estilos + tokens de marca
  js/space.js           · escena 3D (estrellas + nebulosa)
  js/main.js            · navegación, reveals, carrusel, formulario
  img/gularlogo.svg     · logo de Gular
  media/jolly/          · imágenes del proyecto Jolly (.webp)
  media/video/          · previews de proyectos (.mp4) + portadas (.jpg)
```

## Pendientes (completar antes de publicar)
- [ ] Correo real de contacto — en `assets/js/main.js` (`CONTACT_EMAIL`) y en `index.html` (`#mailLink`).
- [ ] WhatsApp real — en `index.html` (`#waLink`).
- [ ] Destino del formulario: hoy abre el correo prellenado (`mailto:`). Para recibirlo
      sin salir del sitio, conectar un servicio tipo Formspree y hacer `POST`.
- [ ] Revisar textos y selección de proyectos con el equipo.

## Notas de contenido
Los videos del carrusel son recortes optimizados (~720p, ~10s, mudos, en bucle)
generados a partir del material original del reel. El material pesado original
**no** vive en este repo.
