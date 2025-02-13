const express = require("express");
const html_to_pdf = require("html-pdf-node");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");

const app = express();

// Middleware para servir archivos estáticos
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  // Manejar las solicitudes OPTIONS pre-flight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Ruta para la página principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Función para generar PDF usando html-pdf-node
async function generatePDF(html, header, footer) {
  const options = {
    format: "A4",
    margin: {
      top: header ? "120px" : "20px", // Aumentar un poco el margen superior
      bottom: footer ? "100px" : "20px", // Aumentar un poco el margen inferior
      left: "10px",
      right: "10px",
    },
    displayHeaderFooter: true,
    headerTemplate: header
      ? `
    <div style="
      position: relative;
      font-size: 15px;
      font-family: Arial, sans-serif;
      width: 100%;
      height: 60px; /* Alto del encabezado */
      box-sizing: border-box;
      display: flex;
      justify-content: center;
      align-items: start; /* Centrar verticalmente */
      padding: 0;
      margin: 0;
      overflow: visible; /* Evitar desbordamiento */
    ">
      <div style="
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: visible;
        transform-origin: top left; /* Origen de la transformación */
      ">
        ${header}
      </div>
    </div>
    `
      : " ", // Si no hay header, se deja vacío
    footerTemplate: footer
      ? `
      <div style="
        position: relative;
        font-size: 15px;
        font-family: Arial, sans-serif;
        width: 100%;
        height: 60px; /* Alto del footer, igual que el header */
        box-sizing: border-box;
        display: flex;
        justify-content: center;
        align-items: center; /* Centrar verticalmente */
        padding: 0;
        margin: 0;
        overflow: visible; /* Evitar desbordamiento */
      ">
        <div style="
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: visible;
          transform-origin: top left; /* Origen de la transformación */
        ">
          ${footer}
        </div>
      </div>
    `
      : " ", // Si no hay footer, se deja vacío
    printBackground: true,
  };

  // Limpiar espacios en blanco excesivos al final del HTML
  const cleanHtml = html.replace(/[\s\n\r]+$/, "");

  const file = { content: cleanHtml };

  try {
    const pdfBuffer = await html_to_pdf.generatePdf(file, options);
    const pdfBase64 = pdfBuffer.toString('base64');
    return pdfBase64; // Devolver el PDF en Base64
  } catch (error) {
    console.error("Error generando PDF:", error);
    throw error;
  }
}

// Ruta para convertir HTML a PDF
app.post("/convert", async (req, res) => {
  try {
    const { html, header, footer } = req.body;

    // Validar que el HTML no esté vacío
    if (!html || html.trim() === "") {
      return res.status(400).send("El contenido HTML es requerido");
    }

    // Agregar estilos base para mejor renderizado
    const styledHtml = `
                ${html}
        `;

    const pdfBase64 = await generatePDF(styledHtml, header, footer);

    // Enviar el base64 como JSON
    res.json({
      status: 'success',
      data: pdfBase64
    });

  } catch (error) {
    console.error("Error en la conversión:", error);
    res.status(500).send("Error al generar el PDF: " + error.message);
  }
});

// El servidor debe estar escuchando en un puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en ${PORT}`);
});