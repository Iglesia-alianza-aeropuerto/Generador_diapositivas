const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// 🔥 Pega aquí tu URL y KEY para hacer la migración una única vez
const SUPABASE_URL = process.env.SUPABASE_URL || "PEGAR_AQUI_LA_URL";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "PEGAR_AQUI_LA_LLAVE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrar() {
  if (!fs.existsSync("canciones.json")) {
    console.log("❌ No se encontró canciones.json");
    return;
  }

  const cancionesDB = JSON.parse(fs.readFileSync("canciones.json"));
  console.log(`Encontradas ${cancionesDB.length} canciones locales. Preparando para migrar...`);

  const { data, error } = await supabase.from("canciones").upsert(
    cancionesDB.map(c => ({
      id: String(c.id), // convertir a texto por si usamos numeric/float id
      titulo: c.titulo,
      slides: c.slides
    }))
  );

  if (error) {
    console.error("❌ Error migrando canciones:", error.message);
  } else {
    console.log(`✅ ¡Migración completada con éxito!`);
    console.log(`Puedes borrar el archivo canciones.json si lo deseas.`);
  }
}

migrar();
