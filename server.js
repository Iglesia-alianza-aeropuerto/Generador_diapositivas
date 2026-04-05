try {
  require("dotenv").config();
} catch (e) {}

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const officeParser = require("officeparser");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL || "URL_VACIA",
  process.env.SUPABASE_KEY || "KEY_VACIA"
);
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const PASSWORD = process.env.ADMIN_PASSWORD || "1234";

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    const nombre = Date.now() + "_" + Math.floor(Math.random()*1000) + "." + ext;
    cb(null, nombre);
  }
});

const upload = multer({ storage });

function normalizar(texto) {
  return texto
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

async function processCancionEnDB(cancion, replaceExisting) {
  const clave = normalizar(cancion.titulo);
  
  const { data: todas, error: errFetch } = await supabase.from("canciones").select("id, titulo");
  if (errFetch) return "error";

  const existente = todas.find(c => normalizar(c.titulo) === clave);

  if (existente) {
    if (replaceExisting) {
      await supabase.from("canciones").update({ slides: cancion.slides }).eq("id", existente.id);
      return "replaced";
    } else {
      return "skipped";
    }
  } else {
    await supabase.from("canciones").insert({
      id: String(cancion.id),
      titulo: cancion.titulo,
      slides: cancion.slides
    });
    return "added";
  }
}

function dividirEnSlides(texto) {
  // Si el texto tiene separadores "---", respetarlos (viene del editor Word)
  if (texto.includes("---")) {
    return texto
      .split(/\n?---\n?/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  // Si no tiene separadores, partir cada 4 lineas no vacias (modo auto)
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

async function procesarArchivo(file) {
  const filePath = file.path;
  const nombreArchivo = file.originalname;
  let slides = [];

  try {
    if (nombreArchivo.endsWith(".pdf")) {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      if (!data.text) return null;
      slides = dividirEnSlides(data.text);
    } else if (nombreArchivo.endsWith(".pptx")) {
      let resultado;
      try {
        resultado = await officeParser.parseOffice(filePath);
      } catch (err) {
        console.log("⚠️ Archivo inválido:", nombreArchivo);
        return null;
      }
      if (resultado && resultado.content) {
        resultado.content.forEach(slide => {
          let textoSlide = "";
          slide.children?.forEach(parrafo => {
            if (parrafo.text && typeof parrafo.text === "string") {
              textoSlide += parrafo.text.trim() + "\n";
            }
          });
          if (textoSlide.trim()) slides.push(textoSlide.trim());
        });
      }
      if (slides.length === 0) return null;
    } else {
      return null;
    }
    return {
      id: Date.now() + Math.random(),
      titulo: nombreArchivo,
      slides: slides
    };
  } catch (error) {
    console.log("❌ Error procesando:", nombreArchivo);
    return null;
  }
}

app.post("/upload", upload.array("archivo", 20), async (req, res) => {
  try {
    if (req.body.password !== PASSWORD) {
      return res.status(403).json({ error: "Acceso denegado" });
    }
    const replaceExisting = req.body.replace === "true";
    const added = [];
    const replaced = [];
    const skipped = [];
    const errors = [];

    for (let file of req.files) {
      let cancion = await procesarArchivo(file);
      if (cancion) {
        const resultado = await processCancionEnDB(cancion, replaceExisting);
        if (resultado === "added") added.push(cancion.titulo);
        else if (resultado === "replaced") replaced.push(cancion.titulo);
        else skipped.push(cancion.titulo);
      } else {
        errors.push(file.originalname);
      }
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }
    res.json({ added, replaced, skipped, errors });
  } catch (error) {
    res.status(500).json({ error: "Error en subida" });
  }
});

app.post("/upload-multiple", upload.array("archivo", 200), async (req, res) => {
  try {
    if (req.body.password !== PASSWORD) {
      return res.status(403).json({ error: "Acceso denegado" });
    }
    const replaceExisting = req.body.replace === "true";
    const added = [];
    const replaced = [];
    const skipped = [];
    const errors = [];

    for (let file of req.files) {
      let cancion = await procesarArchivo(file);
      if (cancion) {
        const resultado = await processCancionEnDB(cancion, replaceExisting);
        if (resultado === "added") added.push(cancion.titulo);
        else if (resultado === "replaced") replaced.push(cancion.titulo);
        else skipped.push(cancion.titulo);
      } else {
        errors.push(file.originalname);
      }
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }
    res.json({ added, replaced, skipped, errors });
  } catch (error) {
    res.status(500).json({ error: "Error en carga masiva" });
  }
});

app.post("/upload-manual", async (req, res) => {
  try {
    const password = req.body.password || req.headers["password"];
    if (password !== PASSWORD) return res.status(403).json({ error: "Acceso denegado" });
    
    const { titulo, texto } = req.body;
    if (!titulo || !texto) return res.status(400).json({ error: "Faltan datos" });

    const slides = dividirEnSlides(texto);
    const cancion = { id: Date.now() + Math.random(), titulo, slides };
    
    const resultado = await processCancionEnDB(cancion, true);
    
    res.json({ resultado });
  } catch(e) {
    res.status(500).json({ error: "Error en subida manual" });
  }
});

app.delete("/eliminar/:id", async (req, res) => {
  const password = req.body.password || req.headers["password"];
  if (password !== PASSWORD) {
    return res.status(403).json({ error: "Acceso denegado" });
  }
  const id = String(req.params.id);
  const { error } = await supabase.from("canciones").delete().eq("id", id);
  if (error) return res.status(404).json({ error: "No encontrada en Supabase" });
  res.json({ eliminada: true });
});

app.put("/editar/:id", async (req, res) => {
  const password = req.body.password || req.headers["password"];
  if (password !== PASSWORD) {
    return res.status(403).json({ error: "Acceso denegado" });
  }
  const id = String(req.params.id);
  const { titulo, texto } = req.body;
  if (!titulo || !texto) {
      return res.status(400).json({ error: "Datos inválidos" });
  }
  const slides = dividirEnSlides(texto);

  const { error } = await supabase.from("canciones").update({ titulo, slides }).eq("id", id);
  if (error) return res.status(500).json({ error: "Error al actualizar en Supabase" });
  res.json({ actualizada: true });
});

app.get("/canciones", async (req, res) => {
  const { data, error } = await supabase.from("canciones").select("*");
  if (error) {
    return res.status(500).json({ error: "Error de BD" });
  }
  res.json(data || []);
});

const PORT = process.env.PORT || 3000;
app.get("/test-db", async (req, res) => {
  const { data, error } = await supabase.from("canciones").select("*");
  if(error) return res.json(error);
  res.json({ mensaje: "Servidor conectado correctamente", total: data.length });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});