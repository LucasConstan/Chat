// Importamos Express, el framework que maneja las requests HTTP.
import express from 'express';
// 'import type' porque Request y Response son solo tipos: al ejecutar desaparecen.
import type { Request, Response } from 'express';

import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';

// Interfaz = forma que tiene una sala. Igual que en C#, pero solo existe para el chequeo de tipos.
interface Room {
  id: number;
  name: string;
  createdAt: Date;
}

// Creamos la aplicación. Es el equivalente a configurar el servidor web.
const app = express();
const PORT = 3000;

// Express es solo el "manejador" de requests; el servidor HTTP lo creamos nosotros
// para poder colgarle también el servidor de WebSockets en el mismo puerto.
const server = createServer(app);
const wss = new WebSocketServer({ server });
// Sockets que respondieron al último ping.
const alive = new WeakSet<WebSocket>();

wss.on('connection', (socket) => {
    // Heartbeat: cada 30 segundos, cerramos a los que no respondieron el ping anterior
    // y les mandamos uno nuevo a los demás.
    setInterval(() => {
      for (const client of wss.clients) {
        if (!alive.has(client)) {
          client.terminate(); // no respondió: lo damos por muerto
          continue;
        }
        alive.delete(client); // lo marcamos como "pendiente" hasta que llegue su pong
        client.ping();
      }
    }, 30_000);
  console.log(`Cliente conectado (total: ${wss.clients.size})`);
  alive.add(socket);
  socket.on('pong', () => alive.add(socket)); // respondió: sigue vivo

  socket.on('close', () => {
    console.log(`Cliente desconectado (total: ${wss.clients.size})`);
  });
});

// "Base de datos" en memoria: un array común. Se borra cada vez que reiniciás el servidor.
const rooms: Room[] = [];
// Contador para generar ids, como un IDENTITY de SQL Server.
let nextId = 1;

// Middleware: se ejecuta en cada request antes de llegar a las rutas.
// Este lee el body cuando viene en JSON y lo deja como objeto en req.body.
app.use(express.json());

// Middleware que sirve los archivos de la carpeta 'public' (HTML, JS, CSS).
// Si pedís http://localhost:3000/ devuelve public/index.html.
app.use(express.static('public'));

// Ruta GET /api/rooms: devuelve todas las salas.
// (req, res) => {...} es una arrow function, como una lambda de C#.
app.get('/api/rooms', (req: Request, res: Response) => {
  // res.json() convierte el array a JSON, pone el header Content-Type
  // y responde con código 200 (OK) por defecto.
  res.json(rooms);
});

// Ruta POST /api/rooms: crea una sala nueva.
app.post('/api/rooms', (req: Request, res: Response) => {
  // req.body es 'any': TypeScript no sabe qué mandó el cliente.
  // El '?.' evita un error si body viene undefined (como el ?. de C#).
  const name = req.body?.name;

  // Validación manual: lo único que nos protege de datos inválidos.
  // TypeScript NO valida nada en tiempo de ejecución.
  if (typeof name !== 'string' || name.trim() === '') {
    // 400 Bad Request: el cliente mandó algo mal.
    res.status(400).json({ error: 'El nombre de la sala es obligatorio' });
    // Cortamos acá: si no, seguiría ejecutando y respondería dos veces.
    return;
  }

  // some() devuelve true si algún elemento cumple la condición (como Any() de LINQ).
  const exists = rooms.some(r => r.name.toLowerCase() === name.trim().toLowerCase());
  if (exists) {
    // 409 Conflict: choca con algo que ya existe.
    res.status(409).json({ error: 'Ya existe una sala con ese nombre' });
    return;
  }

  // Creamos la sala. nextId++ usa el valor actual y después lo incrementa.
  const room: Room = { id: nextId++, name: name.trim(), createdAt: new Date() };
  rooms.push(room);

  // 201 Created: se creó un recurso nuevo. Devolvemos la sala creada.
  res.status(201).json(room);

    // Avisamos a TODOS los clientes conectados, sin que lo pidan.
  const message = JSON.stringify({ type: 'room-created', room });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
});

// Arranca el servidor y queda escuchando conexiones en el puerto.
// El callback se ejecuta una vez, cuando el servidor ya está listo.
server.listen(PORT, () => {
  // Template string con backticks: ${...} inserta valores (como $"..." en C#).
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});