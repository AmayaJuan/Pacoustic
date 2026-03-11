const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const pdf = require("pdf-parse");

const imagesFolder = "./img/products";
const docsFolder = "./doc/products";
const outputFile = "./data/products.json";

const images = fs.readdirSync(imagesFolder);
const docs = fs.readdirSync(docsFolder);

// Función para normalizar nombres
function normalize(name){
  return name
    .toLowerCase()
    .replace(/\.(png|jpg|jpeg|pdf|docx)/g,"")
    .replace(/-/g,"")
    .replace(/á/g,"a")
    .replace(/é/g,"e")
    .replace(/í/g,"i")
    .replace(/ó/g,"o")
    .replace(/ú/g,"u")
    .replace(/ñ/g,"n")
    .replace(/\s/g,"");
}

// Función para encontrar el mejor documento coincidente
function findBestDocument(productName) {
  const manualMapping = {
    "pa10n": "FICHA TECNICA PARLANTE 10 NEODIMIO.docx",
    "parlante 10 sheffieeld": "FICHA TECNICA PARLANTE 10 SHEFIEELD.docx",
    "parlante 12 sheffield": "FICHA TECNICA PARLANTE 12 SHEFFIELD.docx",
    "hl10a": "FICHA TECNICA PA HL 10A.docx",
    "hl30a": "FICHA TECNICA PA HL30A.docx",
    "lf18x": "FICHA TECNICA PARLANTE LF18X401+.docx",
    "woofer18lw2420+": "FICHA TECNICA WOOFER 18LW2420+.docx",
    "pa8n600": "FICHA TECNICA WOOFER PA8N600.pdf",
    "pa12n1000": "FICHA TECNICA WOOFER PA12N1000.pdf"
  };
  
  if (manualMapping[productName]) {
    const mappedDoc = manualMapping[productName];
    if (docs.includes(mappedDoc)) {
      return mappedDoc;
    }
  }
  
  const normalizedProduct = normalize(productName);
  return docs.find(doc => normalize(doc).includes(normalizedProduct)) || null;
}

// Función para detectar la categoría correcta
function detectCategory(name, docName){
  const n = name.toLowerCase();
  const d = (docName || "").toLowerCase();
  
  if(n.includes("hl")) return "Line Array";
  if(d.includes("woofer")) return "Woofer";
  return "Parlantes";
}

// Función para leer archivos DOCX
async function readDocx(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer: buffer });
    return result.value;
  } catch (error) {
    console.error("Error leyendo DOCX " + filePath + ":", error.message);
    return null;
  }
}

// Función para leer archivos PDF
async function readPdf(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const result = await pdf(buffer);
    return result.text;
  } catch (error) {
    console.error("Error leyendo PDF " + filePath + ":", error.message);
    return null;
  }
}

// Función para extraer la descripción
function extractDescription(text, productName) {
  if (!text) return "Producto de audio profesional " + productName;
  
  // Convertir a líneas y limpiar
  const lines = text.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
  
  // === PRIMER INTENTO: Buscar "Descripción:" (maneja mayúsculas/minúsculas) ===
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    // Coincidir con "descripción:", "descripcion:", "descripción" al inicio
    if (lowerLine.match(/^descripción\s*:?/i) || lowerLine.match(/^descripcion\s*:?/i)) {
      let descParts = [];
      // Obtener texto después de "Descripción:"
      const afterDesc = line.replace(/^descripción\s*:*/i, "").replace(/^descripcion\s*:*/i, "").trim();
      if (afterDesc && afterDesc.length > 10) {
        descParts.push(afterDesc);
      }
      
      // Continuar recopilando líneas hasta encontrar otra sección
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        const nextLower = nextLine.toLowerCase();
        
        // Detener si llegamos a otra sección
        if (nextLower.includes("especificaciones") ||
            nextLower.includes("ítem") ||
            nextLower.includes("item") ||
            nextLower.includes("aplicaciones") ||
            nextLower.includes("gráfico") ||
            nextLower.includes("características")) {
          break;
        }
        
        // Agregar líneas que parecen ser descripción
        if (nextLine.length > 10) {
          descParts.push(nextLine);
        }
      }
      
      if (descParts.length > 0) {
        let desc = descParts.join(' ').replace(/\s+/g, ' ').trim();
        if (desc.length > 500) {
          desc = desc.substring(0, 497) + "...";
        }
        return desc;
      }
    }
  }
  
  // === SEGUNDO INTENTO: Para documentos tipo HL (descripción al final después de specs) ===
  // El documento HL tiene: especificaciones -> [Color/Dimensiones] -> Descripción
  // La descripción viene DESPUÉS de las specs y antes de otras secciones
  let foundLastSpec = false;
  let descriptionLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    // Detectar la línea que indica fin de specs (puede ser "Color / acabados" o "Dimensiones")
    // Para HL30A: la línea es solo "Dimensiones" (sin valor)
    // Para HL10A: la línea es "Color / acabados" (con valor)
    // IMPORTANTE: Solo detectar si es el ÚLTIMO campo de specs (línea muy corta)
    if ((lowerLine.includes("color") && lowerLine.includes("acabados")) ||
        (lowerLine === "dimensiones" && lines[i].length < 20)) {
      foundLastSpec = true;
      continue;
    }
    
    // Después del último campo de specs, collecting description
    if (foundLastSpec) {
      // DETENER cuando llegamos a una sección de header (no contenido)
      // NO romper en líneas cortas como "Peso neto" porque pueden ser descripciones
      if (lowerLine === "respuesta en frecuencia" || 
          lowerLine === "respuesta" ||
          lowerLine.includes("gráfico de respuesta") ||
          lowerLine.includes("gráfico") ||
          lowerLine === "aplicaciones" || 
          lowerLine.includes("aplicaciones recomendadas") ||
          lowerLine.startsWith("entradas xlr") ||
          lowerLine.startsWith("salida de") ||
          lowerLine.startsWith("codificador") ||
          lowerLine.startsWith("led de") ||
          lowerLine.startsWith("pantalla de") ||
          lowerLine.startsWith("alimentación")) {
        break;
      }
      
      // Tomar líneas que parecen ser descripción (texto largo con puntuación)
      // El contenido de descripción tiene párrafos largos
      if (line.length > 30 && (line.includes('.') || line.includes(','))) {
        descriptionLines.push(line);
      }
    }
  }
  
  if (descriptionLines.length > 0) {
    let desc = descriptionLines.join(' ').replace(/\s+/g, ' ').trim();
    if (desc.length > 500) {
      desc = desc.substring(0, 497) + "...";
    }
    return desc;
  }
  
  // === TERCER INTENTO: Buscar después de "Características" (PDFs) ===
  let foundFeatures = false;
  let featureLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes("características") || lowerLine.includes("caracteristicas")) {
      foundFeatures = true;
      continue;
    }
    
    if (foundFeatures) {
      // Detener si llegamos a especificaciones técnicas
      if (lowerLine.includes("especificaciones") ||
          lowerLine.includes("ítem") ||
          lowerLine.includes("aplicaciones")) {
        break;
      }
      
      // Agregar líneas con bullets o texto descriptivo
      if (line.length > 20 && (line.includes('') || line.includes('•') || line.includes('-'))) {
        // Limpiar bullets
        const cleanLine = line.replace(/^[•\-\*•\u2022\u2023\u25E6\u2043\u2219\s]+/, "").trim();
        if (cleanLine.length > 10) {
          featureLines.push(cleanLine);
        }
      }
    }
  }
  
  if (featureLines.length > 0) {
    let desc = featureLines.join('. ').replace(/\s+/g, ' ').trim();
    // Agregar punto final si no existe
    if (!desc.endsWith('.')) desc += '.';
    if (desc.length > 500) {
      desc = desc.substring(0, 497) + "...";
    }
    return desc;
  }
  
  // === FALLBACK: Buscar cualquier texto largo después de la primera línea ===
  // Útil para PDFs que tienen descripción al inicio
  let longTextLines = [];
  for (let i = 1; i < Math.min(lines.length, 20); i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    // Saltar si es una línea de especificación o sección
    if (lowerLine.includes("especificaciones") || 
        lowerLine.includes("ítem") ||
        lowerLine.includes("item") ||
        lowerLine.includes("aplicaciones") ||
        line.length < 30) {
      continue;
    }
    
    // Si la línea parece ser descripción (contiene varios espacios o texto largo)
    if (line.length > 40 && (line.includes('.') || line.includes(','))) {
      longTextLines.push(line);
    }
  }
  
  if (longTextLines.length > 0) {
    let desc = longTextLines.join(' ').replace(/\s+/g, ' ').trim();
    if (desc.length > 500) {
      desc = desc.substring(0, 497) + "...";
    }
    return desc;
  }
  
  return "Producto de audio profesional " + productName;
}

// Función para extraer especificaciones
function extractSpecs(text) {
  if (!text) return {};
  
  const specs = {};
  const lines = text.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
  
  let inSpecs = false;
  let pendingKey = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    // Inicio de especificaciones
    if (lowerLine.includes("especificaciones") ||
        lowerLine.includes("ítem") ||
        lowerLine.includes("item") ||
        lowerLine.includes("especificación")) {
      inSpecs = true;
      continue;
    }
    
    // Fin de especificaciones
    if (inSpecs && (lowerLine.includes("aplicaciones") ||
        lowerLine.includes("gráfico") ||
        lowerLine.includes("dimensiones"))) {
      break;
    }
    
    if (!inSpecs) continue;
    
    // Ignorar encabezados
    if (lowerLine.includes("ítem") || 
        lowerLine.includes("item") ||
        lowerLine.includes("descripcion") ||
        lowerLine.includes("especific") ||
        line.length < 3) {
      continue;
    }
    
    // === MANEJO DE FORMATO PDF: "Key Value" en la misma línea ===
    // Para PDFs el formato puede ser "Key Value" (sin dos puntos)
    // Buscar si la línea tiene un patrón como "Palabra1 Paliguabrasiente" donde la primera parte es la key
    if (line.includes(' ') && !line.includes(':') && line.length > 10 && line.length < 60) {
      // Dividir por espacios múltiples o simples
      const parts = line.split(/\s{2,}|\t+/);
      if (parts.length >= 2) {
        // Primera parte es la key, resto es el valor
        let key = parts[0]
          .toLowerCase()
          .replace(/á/g, "a")
          .replace(/é/g, "e")
          .replace(/í/g, "i")
          .replace(/ó/g, "o")
          .replace(/ú/g, "u")
          .replace(/ñ/g, "n")
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, "");
        
        // El valor es todo lo demás
        let value = parts.slice(1).join(' ').replace(/\s+/g, ' ').trim();
        
        if (key.length > 2 && value.length > 0 && value.length < 50) {
          specs[key] = value;
          continue;
        }
      }
    }
    
    // Si tenemos clave pendiente, esta línea es el valor
    if (pendingKey) {
      let value = line.replace(/\s+/g, ' ').trim();
      if (value.length > 0 && value.length < 50) {
        specs[pendingKey] = value;
      }
      pendingKey = null;
    } else {
      // Podría ser una clave
      if (line.length >= 3 && line.length < 35 && !/^\d+$/.test(line)) {
        let key = line
          .toLowerCase()
          .replace(/á/g, "a")
          .replace(/é/g, "e")
          .replace(/í/g, "i")
          .replace(/ó/g, "o")
          .replace(/ú/g, "u")
          .replace(/ñ/g, "n")
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, "");
        
        if (key.length > 2 && !key.includes("item") && !key.includes("descrip")) {
          pendingKey = key;
        }
      }
    }
  }
  
  return specs;
}

// Función para extraer aplicaciones
function extractApplications(text) {
  if (!text) return "";
  
  const lines = text.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
  let apps = [];
  let inApps = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    // Detectar inicio de aplicaciones
    if ((lowerLine.includes("aplicaciones") || lowerLine.includes("aplicaciones recomendadas")) &&
        !lowerLine.includes("especificaciones") &&
        !lowerLine.includes("gráfico")) {
      inApps = true;
      continue;
    }
    
    if (inApps) {
      // Detener si llegamos a otra sección
      if (lowerLine.includes("gráfico") ||
          lowerLine.includes("dimensiones") ||
          lowerLine.includes("respuesta") ||
          line.length < 3) {
        break;
      }
      
      // Limpiar bullets comunes
      const cleanLine = line
        .replace(/^[•\-\*•\u2022\u2023\u25E6\u2043\u2219\u00BF\u00A0\s]+/, "")
        .trim();
      
      // Verificar que parece ser una aplicación válida
      if (cleanLine && cleanLine.length > 3 && cleanLine.length < 60) {
        apps.push(cleanLine);
      }
    }
  }
  
  return apps.join(", ");
}

// Agrupar imágenes por producto
const groupedImages = {};

images.forEach(function(img) {
  const base = img
    .replace(/\.(png|jpg|jpeg)/i,"")
    .split("-")[0];

  if(!groupedImages[base]){
    groupedImages[base] = [];
  }

  groupedImages[base].push(img);
});

// Función principal
async function generateProducts() {
  const products = [];
  const productNames = Object.keys(groupedImages);
  
  console.log("Procesando " + productNames.length + " productos...");
  console.log("");

  for (let i = 0; i < productNames.length; i++) {
    const productName = productNames[i];
    const productImages = groupedImages[productName];

    const mainImage = productImages.find(function(img) { return img.includes("-1"); }) || productImages[0];
    const watermark = productImages.find(function(img) { return img.includes("-2"); }) || null;
    const relatedDoc = findBestDocument(productName);

    let description = "";
    let specs = {};
    let applications = "";
    const category = detectCategory(productName, relatedDoc);

    if (relatedDoc) {
      const docPath = path.join(docsFolder, relatedDoc);
      console.log("  " + productName + " -> " + relatedDoc);
      
      if (relatedDoc.toLowerCase().endsWith('.docx')) {
        const text = await readDocx(docPath);
        if (text) {
          description = extractDescription(text, productName);
          specs = extractSpecs(text);
          applications = extractApplications(text);
        }
      } else if (relatedDoc.toLowerCase().endsWith('.pdf')) {
        const text = await readPdf(docPath);
        if (text) {
          description = extractDescription(text, productName);
          specs = extractSpecs(text);
          applications = extractApplications(text);
        }
      }
    } else {
      console.log("  Sin documento: " + productName);
      description = "Producto de audio profesional " + productName;
    }

    if (applications) {
      specs.aplicaciones = applications;
    }

    products.push({
      id: i + 1,
      name: productName,
      category: category,
      images: {
        main: "img/products/" + mainImage,
        watermark: watermark ? "img/products/" + watermark : null
      },
      description: description,
      document: relatedDoc ? "doc/products/" + relatedDoc : null,
      specs: Object.keys(specs).length > 0 ? specs : {}
    });
  }

  if(!fs.existsSync("./data")){
    fs.mkdirSync("./data");
  }

  fs.writeFileSync(outputFile, JSON.stringify(products, null, 2));

  console.log("");
  console.log("products.json generado con " + products.length + " productos");
  console.log("");
  console.log("Resumen de categorias:");
  const categories = {};
  products.forEach(function(p) {
    categories[p.category] = (categories[p.category] || 0) + 1;
  });
  Object.keys(categories).forEach(function(cat) {
    console.log("   - " + cat + ": " + categories[cat]);
  });
  
  console.log("");
  console.log("Resumen de extraccion:");
  products.forEach(function(p) {
    const descLen = p.description.length;
    const specsCount = Object.keys(p.specs).length;
    const docStatus = p.document ? "OK" : "FALTA";
    console.log("   " + docStatus + " " + p.name + ": desc=" + descLen + " chars, specs=" + specsCount + " campos");
  });
}

generateProducts();

