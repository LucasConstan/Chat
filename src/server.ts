import express from 'express';
// 'import type': son solo tipos, desaparecen al ejecutar.
import type { Request, Response } from 'express';

interface Room {
  id: number;
  name: string;
  createdAt: Date;
}

const app = express();
const PORT = 3000;

// En memoria: se pierde al reiniciar el servidor.
const rooms: Room[] = [];
let nextId = 1;

// Middlewares: se ejecutan en cada request antes de las rutas.
app.use(express.json());           // parsea el body JSON a req.body
app.use(express.static('public')); // sirve el HTML/JS del cliente

app.get('/api/rooms', (req: Request, res: Response) => {
  res.json(rooms);
});

app.post('/api/rooms', (req: Request, res: Response) => {
  // req.body es 'any': TypeScript no valida lo que manda el cliente, hay que hacerlo a mano.
  const name = req.body?.name;

  if (typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: 'El nombre de la sala es obligatorio' });
    return; // sin return seguiría ejecutando y respondería dos veces
  }

  const exists = rooms.some(r => r.name.toLowerCase() === name.trim().toLowerCase());
  if (exists) {
    res.status(409).json({ error: 'Ya existe una sala con ese nombre' });
    return;
  }

  const room: Room = { id: nextId++, name: name.trim(), createdAt: new Date() };
  rooms.push(room);
  res.status(201).json(room); // 201 = recurso creado
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});