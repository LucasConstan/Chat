const form = document.getElementById('room-form');
const input = document.getElementById('room-name');
const list = document.getElementById('room-list');
const errorText = document.getElementById('error');

async function loadRooms() {
  const res = await fetch('/api/rooms');
  const rooms = await res.json(); // leer el body también es asíncrono

  list.innerHTML = '';
  for (const room of rooms) {
    const li = document.createElement('li');
    li.textContent = room.name; // textContent y no innerHTML: evita XSS
    list.appendChild(li);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault(); // evita que el form recargue la página
  errorText.textContent = '';

  const res = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }, // sin esto, express.json() no parsea el body
    body: JSON.stringify({ name: input.value }),
  });

  if (!res.ok) { // ok = código entre 200 y 299
    const data = await res.json();
    errorText.textContent = data.error;
    return;
  }

  input.value = '';
  await loadRooms();
});

loadRooms();