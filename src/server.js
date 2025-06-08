
import express from "express";
import cors from "cors";
import mysql from "mysql2";
import bodyParser from "body-parser";


const app = express();
app.use(cors({
  origin: 'https://finca-rouge.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());
app.options('*', cors({
  origin: 'https://finca-rouge.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: "10mb" }));
app.use((req, res, next) => {
  console.log('Origin:', req.headers.origin);
  next();
});
//si no funciona, intentar con pool
const db = mysql.createConnection({
  host: process.env.DB_HOST ,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: false, // Cambiar a true si se requiere SSL
  
});

// Obtener recolectores
app.get("/recolectores", (req, res) => {
  db.query("SELECT * FROM recolectores", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// Crear recolector
app.post("/recolectores", (req, res) => {
  const { nombre, telefono } = req.body;
  db.query("INSERT INTO recolectores (nombre, telefono) VALUES (?, ?)", [nombre, telefono], (err, result) => {
    if (err) return res.status(500).json(err);
    
    // Devolver el ID del recolector recién creado
    res.json({ 
      message: "Recolector creado",
      id: result.insertId,
      nombre: nombre,
      telefono: telefono
    });
  });
});

// Eliminar recolector
app.delete("/recolectores/:id", (req, res) => {
  const recolectorId = req.params.id;
  
  // Primero verificar si el recolector existe
  db.query("SELECT * FROM recolectores WHERE id = ?", [recolectorId], (err, results) => {
    if (err) return res.status(500).json(err);
    
    if (results.length === 0) {
      return res.status(404).json({ message: "Recolector no encontrado" });
    }
    
    // Eliminar primero las recolecciones asociadas (para mantener integridad referencial)
    db.query("DELETE FROM recolecciones WHERE recolector_id = ?", [recolectorId], (err) => {
      if (err) return res.status(500).json(err);
      
      // Luego eliminar el recolector
      db.query("DELETE FROM recolectores WHERE id = ?", [recolectorId], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ 
          message: "Recolector y sus recolecciones eliminados exitosamente",
          id: recolectorId
        });
      });
    });
  });
});


// Registrar recolecciónes
app.post("/recolecciones", (req, res) => {
  const { recolector_id, cantidad } = req.body;
  db.query("INSERT INTO recolecciones (recolector_id, cantidad) VALUES (?, ?)", [recolector_id, cantidad], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Recolección registrada" });
  });
});

// Ver recolecciones por recolector
app.get("/recolecciones/:recolectorId", (req, res) => {
  const id = req.params.recolectorId;
  db.query("SELECT * FROM recolecciones WHERE recolector_id = ? ORDER BY fecha DESC", [id], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// Editar recolección
app.put("/recolecciones/:id", (req, res) => {
  const { cantidad } = req.body;
  const id = req.params.id;
  db.query("UPDATE recolecciones SET cantidad = ? WHERE id = ?", [cantidad, id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Recolección actualizada" });
  });
});

//recolecciones totales y pagos

// Obtener total recolectado por cada recolector
app.get("/recolectores/totales", (req, res) => {
  const query = `
    SELECT 
      r.id,
      r.nombre,
      r.telefono,
      COALESCE(SUM(rec.cantidad), 0) as total_recolectado,
      COUNT(rec.id) as num_recolecciones
    FROM recolectores r
    LEFT JOIN recolecciones rec ON r.id = rec.recolector_id
    GROUP BY r.id, r.nombre, r.telefono
    ORDER BY total_recolectado DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// Obtener total recolectado por un recolector específico
app.get("/recolectores/:id/total", (req, res) => {
  const recolectorId = req.params.id;
  const query = `
    SELECT 
      r.id,
      r.nombre,
      r.telefono,
      COALESCE(SUM(rec.cantidad), 0) as total_recolectado,
      COUNT(rec.id) as num_recolecciones
    FROM recolectores r
    LEFT JOIN recolecciones rec ON r.id = rec.recolector_id
    WHERE r.id = ?
    GROUP BY r.id, r.nombre, r.telefono
  `;
  
  db.query(query, [recolectorId], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results[0] || null);
  });
});

// Obtener resumen general de todos los recolectores
app.get("/resumen/general", (req, res) => {
  const query = `
    SELECT 
      COUNT(DISTINCT r.id) as total_recolectores,
      COALESCE(SUM(rec.cantidad), 0) as total_general_kg,
      COUNT(rec.id) as total_recolecciones
    FROM recolectores r
    LEFT JOIN recolecciones rec ON r.id = rec.recolector_id
  `;
  
  db.query(query, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results[0]);
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));