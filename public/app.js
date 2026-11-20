// Referencias a los elementos del HTML, buscados por su id.
// Es como tener los controles de un formulario de WinForms.
const form = document.getElementById('room-form');
const input = document.getElementById('room-name');
const list = document.getElementById('room-list');
const errorText = document.getElementById('error');

// wss:// si la página vino por https (como en Codespaces), ws:// si vino por http.
const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
const socket = new WebSocket(`${protocol}//${location.host}`);

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data); // por el socket viaja texto; lo convertimos a objeto
  if (message.type === 'room-created') {
    addRoom(message.room);
  }
});

function addRoom(room) {
  const li = document.createElement('li');
  li.textContent = room.name; // textContent y no innerHTML: evita XSS
  list.appendChild(li);
}

// Pide las salas al servidor y las dibuja en la lista.
async function loadRooms() {
  // fetch hace una request HTTP. Sin opciones, es un GET.
  // await espera la respuesta sin bloquear la página.
  const res = await fetch('/api/rooms');

  // El body llega como texto; .json() lo convierte en objetos JS.
  // También es asíncrono, porque el body puede seguir llegando por la red.
  const rooms = await res.json();

  // Vaciamos la lista antes de volver a dibujarla.
  list.innerHTML = '';

 
    for (const room of rooms) {
    addRoom(room);
  }
}

// Escuchamos el evento 'submit' del formulario (como un handler Click en WinForms).
form.addEventListener('submit', async (e) => {
  // Por defecto, enviar un form recarga la página. Esto lo evita.
  e.preventDefault();
  // Limpiamos el error anterior, si lo había.
  errorText.textContent = '';

  // POST al servidor con el nombre de la sala en JSON.
  const res = await fetch('/api/rooms', {
    method: 'POST',
    // Le avisamos al servidor que el body es JSON, para que express.json() lo procese.
    headers: { 'Content-Type': 'application/json' },
    // JSON.stringify convierte el objeto a texto JSON: {"name":"..."}
    body: JSON.stringify({ name: input.value }),
  });

  // res.ok es true si el código está entre 200 y 299.
  if (!res.ok) {
    // Si falló (400, 409), leemos el mensaje de error que mandó el servidor.
    const data = await res.json();
    errorText.textContent = data.error;
    return;
  }

  // Si salió bien, limpiamos el input y recargamos la lista.
  input.value = '';
});

// Al cargar la página, traemos las salas que ya existen.
loadRooms();