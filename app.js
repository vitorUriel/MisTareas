// 1. Referencias al DOM 
const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const prioritySelect = document.getElementById('priority-select');
const list = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');
const clearDoneBtn = document.getElementById('clear-done-btn');
const progressBar = document.getElementById('progress-bar');

// Estadísticas
const statTotal = document.getElementById('stat-total');
const statPending = document.getElementById('stat-pending');
const statDone = document.getElementById('stat-done');

// Filtros
const filterBtns = document.querySelectorAll('.filter-btn');

// 2. Estado de la aplicación 
let tasks = [];

/** Filtro activo: 'todas' | 'pendientes' | 'completadas' */
let activeFilter = 'todas';

// 3. Persistencia: localStorage

/**
 * Carga las tareas guardadas en localStorage.
 * Si no hay datos o están corruptos, usa un arreglo vacío.
 */
function loadTasks() {
  try {
    const raw = localStorage.getItem('pwa_tasks');
    tasks = raw ? JSON.parse(raw) : [];
  } catch {
    tasks = [];
  }
}

/* Guarda el arreglo de tareas en localStorage. */
function saveTasks() {
  localStorage.setItem('pwa_tasks', JSON.stringify(tasks));
}

// 4. Renderizado 

/*
Filtra las tareas según el filtro activo y las renderiza en el DOM. Y también actualiza estadísticas y barra de progreso.
*/
function renderTasks() {
  // Filtrar según el estado activo
  const filtered = tasks.filter(task => {
    if (activeFilter === 'pendientes') return !task.done;
    if (activeFilter === 'completadas') return task.done;
    return true; 
  });

  list.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.hidden = false;
  } else {
    emptyState.hidden = true;
    filtered.forEach(task => list.appendChild(createTaskElement(task)));
  }

  updateStats();
  updateProgress();
}

/**
 * Crea y retorna el elemento <li> correspondiente a una tarea.
 * @param {object} task — objeto de tarea
 * @returns {HTMLLIElement}
 */
function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = `task-item priority-${task.priority}${task.done ? ' done' : ''}`;
  li.dataset.id = task.id;

  // Checkbox para marcar como completada
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-check';
  checkbox.checked = task.done;
  checkbox.setAttribute('aria-label', `Marcar "${task.text}" como ${task.done ? 'pendiente' : 'completada'}`);
  checkbox.addEventListener('change', () => toggleDone(task.id));

  // Texto de la tarea
  const span = document.createElement('span');
  span.className = 'task-text';
  span.textContent = task.text;

  // Badge de prioridad
  const badge = document.createElement('span');
  badge.className = `priority-badge badge-${task.priority}`;
  const labels = { alta: '🔴 Alta', normal: '⚪ Normal', baja: '🟢 Baja' };
  badge.textContent = labels[task.priority] ?? task.priority;

  // Botón de eliminar
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.innerHTML = '✕';
  deleteBtn.setAttribute('aria-label', `Eliminar tarea: ${task.text}`);
  deleteBtn.addEventListener('click', () => deleteTask(task.id, li));

  li.append(checkbox, span, badge, deleteBtn);
  return li;
}

// 5. Estadísticas y progreso 

/*
 Actualiza los contadores de total, pendientes y completadas.
 */
function updateStats() {
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const pending = total - done;

  animateNumber(statTotal, total);
  animateNumber(statPending, pending);
  animateNumber(statDone, done);
}

/**
 * Actualiza el ancho de la barra de progreso.
 * Si no hay tareas, la barra queda en 0%.
 */
function updateProgress() {
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  progressBar.style.width = `${pct}%`;
  progressBar.setAttribute('aria-valuenow', pct);
}

/**
 * Pequeña animación de "rebote" al cambiar un número en las stats.
 * @param {HTMLElement} el  — elemento a animar
 * @param {number}      val — nuevo valor
 */
function animateNumber(el, val) {
  el.textContent = val;
  el.style.transform = 'scale(1.3)';
  setTimeout(() => { el.style.transform = 'scale(1)'; }, 200);
}

//  6. Acciones CRUD 

/*
  Agrega una nueva tarea al arreglo y re-renderiza.
  Se llama al enviar el formulario.
  @param {Event} e
 */
function addTask(e) {
  e.preventDefault();

  const text = input.value.trim();
  const priority = prioritySelect.value;

  if (!text) return;

  // Límite de caracteres (también forzado en HTML con maxlength)
  if (text.length > 100) return;

  const newTask = {
    id: String(Date.now()),
    text,
    priority,
    done: false,
    createdAt: Date.now(),
  };

  tasks.unshift(newTask); // Inserta al principio
  saveTasks();
  renderTasks();

  // Limpiar campos
  input.value = '';
  prioritySelect.value = 'normal';
  input.focus();
}

/*
  Alterna el estado completado/pendiente de una tarea.
  @param {string} id — id de la tarea
 */
function toggleDone(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  task.done = !task.done;
  saveTasks();
  renderTasks();
}

/*
  Elimina una tarea con animación de salida.
  @param {string}      id — id de la tarea
  @param {HTMLElement} li — elemento de lista a animar
 */
function deleteTask(id, li) {
  li.classList.add('removing');

  // Espera a que termine la animación CSS antes de eliminar del DOM
  li.addEventListener('animationend', () => {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
  }, { once: true });
}

/*
  Elimina todas las tareas marcadas como completadas.
 */
function clearDoneTasks() {
  const hasDone = tasks.some(t => t.done);
  if (!hasDone) return;

  if (confirm('¿Eliminar todas las tareas completadas?')) {
    tasks = tasks.filter(t => !t.done);
    saveTasks();
    renderTasks();
  }
}

// 7. Filtros 

/*
  Cambia el filtro activo y re-renderiza la lista.
  @param {string} filter — 'todas' | 'pendientes' | 'completadas'
 */
function setFilter(filter) {
  activeFilter = filter;

  // Actualizar clases CSS de los botones
  filterBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });

  renderTasks();
}

// 8. Event Listeners 

form.addEventListener('submit', addTask);

clearDoneBtn.addEventListener('click', clearDoneTasks);

// Registrar click en cada botón de filtro
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => setFilter(btn.dataset.filter));
});

//  9. Inicialización 
loadTasks();
renderTasks();

// 10. Registro del Service Worker (PWA) 
/**
 * REQUISITO PWA: El Service Worker (sw.js) es el núcleo del
 * funcionamiento offline de la aplicación.
 *
 * ¿Qué hace?
 *  - Se instala en el navegador la primera vez que el usuario
 *    visita la app.
 *  - Intercepta las peticiones de red (fetch) para servir
 *    recursos desde el caché cuando no hay conexión.
 *  - Permite que la app funcione completamente offline.
 *
 * Buenas prácticas:
 *  - Se registra en el evento 'load' para no bloquear la
 *    carga inicial de la página.
 *  - Se verifica soporte con 'serviceWorker' in navigator
 *    antes de intentar el registro (compatibilidad).
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then(registration => {
        console.log('[PWA] Service Worker registrado. Scope:', registration.scope);
      })
      .catch(err => {
        console.error('[PWA] Error al registrar el Service Worker:', err);
      });
  });
}