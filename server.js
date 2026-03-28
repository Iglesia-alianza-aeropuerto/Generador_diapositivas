const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const officeParser = require("officeparser");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Servir index.html + assets desde la raíz

// 📁 crear carpeta uploads si no existe
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// 📁 almacenamiento archivos
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    const nombre = Date.now() + "_" + Math.floor(Math.random()*1000) + "." + ext;
    cb(null, nombre);
  }
});

const upload = multer({ storage });

// 🔥 base de datos persistente
let cancionesDB = [];

// 🔥 cargar desde JSON al iniciar
if (fs.existsSync("canciones.json")) {
  cancionesDB = JSON.parse(fs.readFileSync("canciones.json"));
}

// 🔥 guardar en JSON
function guardarDB() {
  fs.writeFileSync("canciones.json", JSON.stringify(cancionesDB, null, 2));
}

function encontrarIndicePorTitulo(titulo) {
  if (!titulo) return -1;
  const clave = titulo.trim().toLowerCase();
  return cancionesDB.findIndex(c => c.titulo && c.titulo.trim().toLowerCase() === clave);
}

function processCancionEnDB(cancion, replaceExisting) {
  const idx = encontrarIndicePorTitulo(cancion.titulo);
  if (idx !== -1) {
    if (replaceExisting) {
      cancionesDB[idx] = cancion;
      return "replaced";
    } else {
      return "skipped";
    }
  } else {
    cancionesDB.push(cancion);
    return "added";
  }
}

// 🔥 dividir texto (PDF)
function dividirEnSlides(texto) {
  let lineas = texto.split("\n").filter(l => l.trim() !== "");

  let slides = [];
  let slideActual = [];

  lineas.forEach(linea => {
    slideActual.push(linea);

    if (slideActual.length === 4) {
      slides.push(slideActual.join("\n"));
      slideActual = [];
    }
  });

  if (slideActual.length > 0) {
    slides.push(slideActual.join("\n"));
  }

  return slides;
}

// 🔥 PROCESAR ARCHIVO (REUTILIZABLE)
async function procesarArchivo(file) {

  const filePath = file.path;
  const nombreArchivo = file.originalname;

  let slides = [];

  try {

    // 📄 PDF
    if (nombreArchivo.endsWith(".pdf")) {

      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);

      if (!data.text) return null;

      slides = dividirEnSlides(data.text);
    }

    // 📊 PPTX
    else if (nombreArchivo.endsWith(".pptx")) {

      let resultado;

      try {
        resultado = await officeParser.parseOffice(filePath);
      } catch (err) {
        console.log("⚠️ Archivo inválido:", nombreArchivo);
        return null; // 🔥 IGNORAR
      }

      if (resultado && resultado.content) {

        resultado.content.forEach(slide => {

          let textoSlide = "";

          slide.children?.forEach(parrafo => {
            if (parrafo.text && typeof parrafo.text === "string") {
              textoSlide += parrafo.text.trim() + "\n";
            }
          });

          if (textoSlide.trim()) {
            slides.push(textoSlide.trim());
          }

        });
      }

      if (slides.length === 0) return null;
    }

    else {
      return null;
    }

    return {
      id: Date.now() + Math.random(),
      titulo: nombreArchivo,
      slides: slides
    };

  } catch (error) {
    console.log("❌ Error procesando:", nombreArchivo);
    return null; // 🔥 NO rompe el sistema
  }
}

//
// 🚀 1. SUBIDA NORMAL (1 o varios archivos manualmente)
//
app.post("/upload", upload.array("archivo", 20), async (req, res) => {
  try {

    const replaceExisting = req.body.replace === "true";
    const added = [];
    const replaced = [];
    const skipped = [];
    const errors = [];

    for (let file of req.files) {

      let cancion = await procesarArchivo(file);

      if (cancion) {
        const resultado = processCancionEnDB(cancion, replaceExisting);

        if (resultado === "added") added.push(cancion.titulo);
        else if (resultado === "replaced") replaced.push(cancion.titulo);
        else if (resultado === "skipped") skipped.push(cancion.titulo);

      } else {
        errors.push(file.originalname);
      }

      fs.unlinkSync(file.path);
    }

    guardarDB();

    res.json({
      mensaje: "Canciones procesadas",
      added,
      replaced,
      skipped,
      errors
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en subida normal" });
  }
});

//
// 🚀 2. SUBIDA MASIVA (CARPETA COMPLETA)
//
app.post("/upload-multiple", upload.array("archivo", 200), async (req, res) => {
  try {

    const replaceExisting = req.body.replace === "true";
    const added = [];
    const replaced = [];
    const skipped = [];
    const errors = [];

    for (let file of req.files) {

      let cancion = await procesarArchivo(file);

      if (cancion) {
        const resultado = processCancionEnDB(cancion, replaceExisting);

        if (resultado === "added") added.push(cancion.titulo);
        else if (resultado === "replaced") replaced.push(cancion.titulo);
        else if (resultado === "skipped") skipped.push(cancion.titulo);

      } else {
        errors.push(file.originalname);
      }

      fs.unlinkSync(file.path);
    }

    guardarDB();

    res.json({
      mensaje: "Carga masiva completada",
      totalProcesadas: added.length + replaced.length,
      added,
      replaced,
      skipped,
      errors
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en carga masiva" });
  }
});

//
// 📥 obtener canciones
//
app.get("/canciones", (req, res) => {
  res.json(cancionesDB);
});

//
// 🚀 iniciar servidor
//
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});