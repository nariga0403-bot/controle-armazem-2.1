const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database(process.env.DB_PATH || path.join(__dirname, "data.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS containers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL,
  area TEXT NOT NULL,
  responsible TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Em andamento',
  created_at TEXT NOT NULL,
  finished_at TEXT
);
CREATE TABLE IF NOT EXISTS responsibles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1
);
`);

const count = db.prepare("SELECT COUNT(*) AS c FROM responsibles").get().c;
if (!count) {
  const add = db.prepare("INSERT INTO responsibles(name) VALUES (?)");
  for (const name of ["Wendel", "Romário", "Leone"]) add.run(name);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_, res) => res.json({ ok: true }));

app.get("/api/containers", (_, res) => {
  res.json(db.prepare("SELECT * FROM containers ORDER BY id DESC").all());
});

app.post("/api/containers", (req, res) => {
  const { number, area, responsible, created_at } = req.body;
  if (!number || !area || !responsible) return res.status(400).json({ error: "Preencha os campos obrigatórios." });
  const info = db.prepare(`
    INSERT INTO containers(number, area, responsible, status, created_at)
    VALUES (?, ?, ?, 'Em andamento', ?)
  `).run(String(number).trim(), String(area).trim(), String(responsible).trim(), created_at || new Date().toISOString());
  res.json(db.prepare("SELECT * FROM containers WHERE id=?").get(info.lastInsertRowid));
});

app.put("/api/containers/:id", (req, res) => {
  const id = Number(req.params.id);
  const { number, area, responsible, status, finished_at } = req.body;
  const row = db.prepare("SELECT * FROM containers WHERE id=?").get(id);
  if (!row) return res.status(404).json({ error: "Registro não encontrado." });
  db.prepare(`
    UPDATE containers
    SET number=?, area=?, responsible=?, status=?, finished_at=?
    WHERE id=?
  `).run(
    number ?? row.number, area ?? row.area, responsible ?? row.responsible,
    status ?? row.status, finished_at ?? row.finished_at, id
  );
  res.json(db.prepare("SELECT * FROM containers WHERE id=?").get(id));
});

app.delete("/api/containers/:id", (req, res) => {
  db.prepare("DELETE FROM containers WHERE id=?").run(Number(req.params.id));
  res.json({ ok: true });
});

app.get("/api/responsibles", (_, res) => {
  res.json(db.prepare("SELECT * FROM responsibles WHERE active=1 ORDER BY name").all());
});

app.post("/api/responsibles", (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "Informe o nome." });
  try {
    const info = db.prepare("INSERT INTO responsibles(name) VALUES (?)").run(name);
    res.json(db.prepare("SELECT * FROM responsibles WHERE id=?").get(info.lastInsertRowid));
  } catch {
    res.status(409).json({ error: "Esse responsável já existe." });
  }
});

app.put("/api/responsibles/:id", (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "Informe o nome." });
  try {
    db.prepare("UPDATE responsibles SET name=? WHERE id=?").run(name, Number(req.params.id));
    res.json(db.prepare("SELECT * FROM responsibles WHERE id=?").get(Number(req.params.id)));
  } catch {
    res.status(409).json({ error: "Esse nome já existe." });
  }
});

app.delete("/api/responsibles/:id", (req, res) => {
  db.prepare("UPDATE responsibles SET active=0 WHERE id=?").run(Number(req.params.id));
  res.json({ ok: true });
});

app.get("*", (_, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`Controle Armazém 2.1 rodando na porta ${PORT}`));
