# 🎶 Generador de Culto — Estado del Proyecto

## ✅ Lo que YA está hecho

### Backend (`server.js`)
- Node.js + Express corriendo en Render.com
- Supabase como base de datos (tabla `canciones` con columnas `id`, `titulo`, `slides`)
- Endpoints completos:
  - `GET /canciones` → lista todas las canciones
  - `POST /upload` → sube archivos (PDF/PPTX) y extrae texto
  - `POST /upload-manual` → permite crear/editar canción por texto plano
  - `PUT /editar/:id` → edita canción por ID
  - `DELETE /eliminar/:id` → elimina canción
  - `GET /test-db` → verifica conexión a Supabase
- Variables de entorno: `SUPABASE_URL`, `SUPABASE_KEY`, `ADMIN_PASSWORD`
- Carpeta estática `/public/` declarada con `express.static`

### Frontend (`index.html`)
- Listado de canciones cargado desde Supabase
- Buscador y ordenador de canciones
- Selección múltiple de canciones (con orden de culto)
- **Selector de formato:** Presencial / Facebook / Ambas
- **Modal Preview** → Vista tipo libreto de las canciones
- **Modal Editor tipo Word** → Editar letras con separador `---`
- Botones con colores y emojis: 🎞️ Generar, 👁️ Preview, 🧹 Limpiar, 🗑️ Eliminar, ✏️ Editar
- Contraseña admin guardada en session → no se pide dos veces
- Generación de PPTX Presencial → **funciona correctamente**
- Generación de PPTX Facebook → **genera el archivo pero slides salen en blanco** (bug pendiente)

### Archivos de imágenes (extraídas del ejemplo Facebook)
- `public/plantilla.png` → fondo principal de slides Facebook (400 KB)
- `public/intermedio.png` → fondo de slide de separación entre canciones (12 KB)

---

## ❌ Lo que FALTA / está roto

### 🔴 Bug principal: PPTX Facebook genera slides en blanco
**Causa identificada:** El `index.html` pesa ~1.1 MB porque las imágenes de Facebook están incrustadas como cadenas Base64 (`intermedioFacebook` y `plantillaFacebook`). Esto sobrecarga el DOM/navegador al generar el PPTX.

**Solución planeada:**
1. Eliminar los strings Base64 del `index.html`
2. Reemplazarlos con rutas a los archivos en `/public/`:
   ```javascript
   const intermedioFacebook = "/public/intermedio.png";
   const plantillaFacebook = "/public/plantilla.png";
   ```
3. Verificar que PptxGenJS acepta rutas URL (necesita `fetch` para convertir a base64 dinámicamente o usar el path absoluto del servidor)
4. Actualizar versión visible a `v2.1`

> [!IMPORTANT]
> PptxGenJS en el navegador requiere imágenes en base64 o URL completa accesible públicamente. Se debe usar `fetch(url).then(r => r.blob()).then(b => ...)` para convertir la URL al blob antes de insertar en el PPT.

---

## 📋 Estado general

| Funcionalidad | Estado |
|---|---|
| Base de datos Supabase | ✅ Funcionando |
| Cargar/listar canciones | ✅ Funcionando |
| Editar canciones (modal Word) | ✅ Funcionando |
| Eliminar canciones | ✅ Funcionando |
| Subir archivos PDF/PPTX | ✅ Funcionando |
| PPTX Presencial | ✅ Funcionando |
| Preview del culto | ✅ Funcionando |
| PPTX Facebook | ❌ Slides en blanco |
| PPTX Ambas (dos archivos) | 🟡 Lógica implementada, depende del bug Facebook |
| Imágenes en `/public/` | ✅ Extraídas y guardadas |
| Deploy en Render.com | ✅ Auto-deploy desde GitHub |

---

## 🚀 Prompt para retomar el trabajo

```
Hola! Seguimos trabajando en el proyecto "Generador de Culto" (app web para 
generar diapositivas PPTX de canciones para la iglesia), deployado en Render.com 
con auto-deploy desde GitHub.

El proyecto está en: c:\Users\Usuario\Downloads\app-iglesia\app-iglesia\

Stack: Node.js + Express + Supabase + PptxGenJS (en el navegador) + HTML/JS puro.

PROBLEMA PENDIENTE A RESOLVER:
El formato de PPTX "Facebook" genera un archivo pero las slides salen completamente 
en blanco. La causa es que el index.html (1.1 MB) tiene dos constantes enormes con 
imágenes en Base64 incrustadas directamente:
- `const intermedioFacebook = "data:image/png;base64,..."` (12 KB de imagen)
- `const plantillaFacebook = "data:image/png;base64,..."` (400 KB de imagen)

Esto sobrecarga el DOM y falla la generación.

SOLUCIÓN YA PREPARADA:
- Las imágenes ya fueron extraídas del ejemplo y están en:
  - /public/intermedio.png (12 KB) 
  - /public/plantilla.png (400 KB)
- El servidor ya sirve la carpeta /public/ como estática

LO QUE HAY QUE HACER:
1. En index.html, eliminar los dos strings Base64 gigantes de las constantes 
   `intermedioFacebook` y `plantillaFacebook`
2. Reemplazarlos con una función que cargue la imagen desde la URL del servidor 
   usando fetch() y convierta a base64 para PptxGenJS (que require base64 en browser)
3. La función `generarPPTFacebook()` debe:
   - Hacer fetch de `/public/plantilla.png` → convertir a base64 → usar como 
     fondo de slides de letra
   - Hacer fetch de `/public/intermedio.png` → convertir a base64 → usar como 
     fondo de slide intermedio entre canciones
4. Actualizar la versión visible de "2.0" a "2.1"
5. Hacer commit y push para que Render re-depliegue

Referencia del formato Facebook (del archivo Ejemplos/facebook.pptx):
- Dimensiones: 10" x 5.63" (widescreen)
- Fondo: imagen plantilla.png a todo el slide
- Texto: Arial Black, blanco, centrado, tamaño ~28-32pt
- Entre canciones: slide separador con imagen intermedio.png
- Mismo juego de slides que el formato Presencial pero con este diseño diferente

Por favor, empieza revisando el estado actual del index.html para entender 
la estructura de la función generarPPTFacebook() y luego aplica los cambios.
```
