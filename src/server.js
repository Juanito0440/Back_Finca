
import express from "express";
import cors from "cors";
import mysql from "mysql2";

const app = express();
app.use(cors());
app.use(express.json());

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
  db.query("INSERT INTO recolectores (nombre, telefono) VALUES (?, ?)", [nombre, telefono], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Recolector creado" });
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));