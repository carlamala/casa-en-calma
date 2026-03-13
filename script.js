import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDlLbBgfhDPr3XLJaRvSVVXxKc9NBXA3Tk",
  authDomain: "casa-en-calma.firebaseapp.com",
  projectId: "casa-en-calma",
  storageBucket: "casa-en-calma.firebasestorage.app",
  messagingSenderId: "528896377818",
  appId: "1:528896377818:web:85b258dc41aecadb1fb6e3",
  measurementId: "G-3LH1BJ2D0X"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const defaultTasks = [
  {
    id: 1,
    title: "Compra en el supermercado",
    category: "weekly",
    assignedTo: "Carla",
    duration: 60,
    priority: "alta",
    status: "pending",
    points: 10
  },
  {
    id: 2,
    title: "Dar de comer a los animales",
    category: "daily",
    assignedTo: "shared",
    duration: 10,
    priority: "alta",
    status: "pending",
    points: 5
  },
  {
    id: 3,
    title: "Preparar barbacoas del fin de semana",
    category: "weekly",
    assignedTo: "Jordi",
    duration: 45,
    priority: "media",
    status: "pending",
    points: 10
  },
  {
    id: 4,
    title: "Limpieza de cocina",
    category: "daily",
    assignedTo: "Carla",
    duration: 20,
    priority: "media",
    status: "pending",
    points: 5
  },
  {
    id: 5,
    title: "Basuras / deixallería",
    category: "weekly",
    assignedTo: "Jordi",
    duration: 25,
    priority: "media",
    status: "pending",
    points: 10
  },
  {
    id: 6,
    title: "Barrer y fregar",
    category: "daily",
    assignedTo: "shared",
    duration: 25,
    priority: "media",
    status: "pending",
    points: 10
  }
];

const rewardIdeas = [
  {
    title: "Cena especial en casa",
    text: "Os habéis coordinado bien este mes. Esta noche toca hamburguesas especiales, velitas y peli."
  },
  {
    title: "Paseo por la montaña + café",
    text: "Habéis hecho equipo. Os propongo una salida tranquila juntos para desconectar y respirar."
  },
  {
    title: "Desayuno fuera",
    text: "Bonus desbloqueado: una mañana sin prisas, café rico y algo bueno para celebrar."
  },
  {
    title: "Noche de peli y manta",
    text: "Os merecéis un plan cómodo, bonito y cero tareas. Solo descanso y estar juntos."
  }
];

const weekDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const HOME_ID = "carla-jordi-home";

let currentUser = localStorage.getItem("casaEnCalmaUser");
let tasks = [];
let history = [];
let availability = createDefaultAvailability();

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove("hidden");

  clearTimeout(window.toastTimeout);

  window.toastTimeout = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2500);
}

function setupUserSelection() {
  const selector = document.getElementById("userSelector");
  if (!selector) return;

  if (!currentUser) {
    selector.style.display = "flex";
  } else {
    selector.style.display = "none";
  }

  const carlaBtn = document.getElementById("selectCarla");
  const jordiBtn = document.getElementById("selectJordi");

  if (carlaBtn) {
    carlaBtn.addEventListener("click", () => {
      localStorage.setItem("casaEnCalmaUser", "Carla");
      location.reload();
    });
  }

  if (jordiBtn) {
    jordiBtn.addEventListener("click", () => {
      localStorage.setItem("casaEnCalmaUser", "Jordi");
      location.reload();
    });
  }
}

function createDefaultAvailability() {
  return weekDays.map(day => ({
    day,
    carla: 2,
    jordi: 2
  }));
}

function getHomeRef() {
  return doc(db, "homes", HOME_ID);
}

async function saveAll() {
  const now = new Date();
  const currentMonth = now.getMonth();

  await setDoc(getHomeRef(), {
    tasks,
    history,
    availability,
    month: currentMonth
  });
}

async function initializeSharedData() {
  const homeRef = getHomeRef();
  const snap = await getDoc(homeRef);

  if (!snap.exists()) {
    tasks = defaultTasks;
    history = [];
    availability = createDefaultAvailability();
    await saveAll();
  }

  onSnapshot(homeRef, (docSnap) => {
    if (!docSnap.exists()) return;

    const data = docSnap.data();

    tasks = data.tasks || defaultTasks;
    history = data.history || [];
    availability = data.availability || createDefaultAvailability();

    handleMonthlyResetIfNeeded(data.month);

    renderTasks(getActiveFilter());
    renderCalendar();
    renderHistory();
  });
}

function handleMonthlyResetIfNeeded(savedMonth) {
  const now = new Date();
  const currentMonth = now.getMonth();

  if (savedMonth === undefined || savedMonth === null) return;

  if (Number(savedMonth) !== currentMonth) {
    tasks.forEach(task => {
      if (task.status === "done") {
        task.status = "pending";
      }
    });

    history.unshift({
      text: "Nuevo mes: se ha reiniciado el progreso mensual.",
      timestamp: new Date().toLocaleString()
    });

    saveAll();
  }
}

function formatCategory(category) {
  const map = {
    daily: "Diaria",
    weekly: "Semanal",
    monthly: "Mensual",
    oneoff: "Puntual"
  };
  return map[category] || category;
}

function statusText(status) {
  const map = {
    pending: "Pendiente",
    done: "Hecha",
    postponed: "Aplazada"
  };
  return map[status] || status;
}

function statusClass(status) {
  const map = {
    pending: "pending",
    done: "done",
    postponed: "postponed"
  };
  return map[status] || "pending";
}

function createTaskCard(task) {
  const card = document.createElement("div");
  card.className = "task-card";

  card.innerHTML = `
    <div class="task-card-header">
      <h3>${task.title}</h3>
      <span class="badge ${statusClass(task.status)}">${statusText(task.status)}</span>
    </div>
    <p class="task-meta">${formatCategory(task.category)} · ${task.duration} min · Prioridad ${task.priority}</p>
    <div class="task-badges">
      <span class="badge points">${task.points} pts</span>
      <span class="badge pending">${task.assignedTo === "shared" ? "Compartida" : task.assignedTo}</span>
    </div>
    <div class="task-actions">
  <button class="done-btn" data-id="${task.id}">Hecha</button>
  <button class="postpone-btn" data-id="${task.id}">Aplazar</button>
  <button class="delete-btn" data-id="${task.id}">Eliminar</button>
</div>
  `;

  const doneBtn = card.querySelector(".done-btn");
  const postponeBtn = card.querySelector(".postpone-btn");
const deleteBtn = card.querySelector(".delete-btn");

  doneBtn.addEventListener("click", () => markTaskDone(task.id));
  postponeBtn.addEventListener("click", () => postponeTask(task.id));
deleteBtn.addEventListener("click", () => deleteTask(task.id));

  return card;
}

function renderTasks(filter = "all") {
  const carlaContainer = document.getElementById("carlaTasks");
  const jordiContainer = document.getElementById("jordiTasks");
  const sharedContainer = document.getElementById("sharedTasks");
  const allTasksList = document.getElementById("allTasksList");

  if (!carlaContainer || !jordiContainer || !sharedContainer || !allTasksList) return;

  carlaContainer.innerHTML = "";
  jordiContainer.innerHTML = "";
  sharedContainer.innerHTML = "";
  allTasksList.innerHTML = "";

  tasks.forEach(task => {
    const homeCard = createTaskCard(task);
    const listCard = createTaskCard(task);

    if (task.assignedTo === currentUser) {
      carlaContainer.appendChild(homeCard);
    } else if (task.assignedTo === "shared") {
      sharedContainer.appendChild(homeCard);
    } else {
      jordiContainer.appendChild(homeCard);
    }

    if (filter === "all" || task.category === filter) {
      allTasksList.appendChild(listCard);
    }
  });

  const userTasksTitle = document.getElementById("userTasksTitle");
  const otherTasksTitle = document.getElementById("otherTasksTitle");

  if (userTasksTitle) {
    userTasksTitle.textContent = "Tus tareas";
  }

  if (otherTasksTitle) {
    const otherUser = currentUser === "Carla" ? "Jordi" : "Carla";
    otherTasksTitle.textContent = `Tareas de ${otherUser}`;
  }

  updateSummary();
}

async function markTaskDone(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  task.status = "done";

  history.unshift({
    text: `${task.assignedTo === "shared" ? "Tarea compartida" : task.assignedTo} completó "${task.title}"`,
    timestamp: new Date().toLocaleString()
  });

  await saveAll();
  showToast(`Tarea completada: ${task.title}`);
}

async function postponeTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  task.status = "postponed";

  history.unshift({
    text: `"${task.title}" fue aplazada`,
    timestamp: new Date().toLocaleString()
  });
async function deleteTask(id) {
  const confirmDelete = confirm("¿Seguro que quieres eliminar esta tarea?");
  if (!confirmDelete) return;

  const taskToDelete = tasks.find(task => task.id === id);

  tasks = tasks.filter(task => task.id !== id);

  history.unshift({
    text: `Se eliminó la tarea "${taskToDelete?.title || "sin nombre"}"`,
    timestamp: new Date().toLocaleString()
  });

  await saveAll();
  showToast("Tarea eliminada");
}

  await saveAll();
  showToast(`Tarea aplazada: ${task.title}`);
}

function updateMonthlyProgress() {
  const monthlyGoal = 20;

  const totalDonePoints = tasks
    .filter(task => task.status === "done")
    .reduce((acc, task) => acc + task.points, 0);

  const progressPercent = Math.min((totalDonePoints / monthlyGoal) * 100, 100);

  const pointsText = document.getElementById("monthlyPointsText");
  const progressFill = document.getElementById("monthlyProgressFill");
  const progressMessage = document.getElementById("monthlyProgressMessage");

  if (pointsText && progressFill && progressMessage) {
    pointsText.textContent = `${totalDonePoints} / ${monthlyGoal} pts`;
    progressFill.style.width = `${progressPercent}%`;

    let message = "Aún estáis empezando. Cada tarea hecha os acerca a vuestro plan del mes.";

    if (totalDonePoints >= monthlyGoal) {
      message = "Objetivo mensual conseguido. Ya podéis generar vuestra recompensa.";
    } else if (totalDonePoints >= 15) {
      message = "Ya casi lo tenéis. Estáis muy cerca de desbloquear vuestro plan del mes.";
    } else if (totalDonePoints >= 8) {
      message = "Vais muy bien. Ya se nota el progreso y la constancia.";
    }

    progressMessage.textContent = message;
  }

  const homeText = document.getElementById("homeProgressText");
  const homeFill = document.getElementById("homeProgressFill");

  if (homeText && homeFill) {
    homeText.textContent = `${totalDonePoints} / ${monthlyGoal} pts`;
    homeFill.style.width = `${progressPercent}%`;
  }
}

function updateSummary() {
  const carlaMinutes = tasks
    .filter(t => t.assignedTo === "Carla" && t.status !== "done")
    .reduce((acc, t) => acc + t.duration, 0);

  const jordiMinutes = tasks
    .filter(t => t.assignedTo === "Jordi" && t.status !== "done")
    .reduce((acc, t) => acc + t.duration, 0);

  const carlaLoad = document.getElementById("carlaLoad");
  const jordiLoad = document.getElementById("jordiLoad");

  if (carlaLoad) carlaLoad.textContent = `Carga estimada: ${carlaMinutes} min`;
  if (jordiLoad) jordiLoad.textContent = `Carga estimada: ${jordiMinutes} min`;

  const carlaDoneTasks = tasks.filter(t => t.assignedTo === "Carla" && t.status === "done");
  const jordiDoneTasks = tasks.filter(t => t.assignedTo === "Jordi" && t.status === "done");

  const carlaPoints = carlaDoneTasks.reduce((acc, t) => acc + t.points, 0);
  const jordiPoints = jordiDoneTasks.reduce((acc, t) => acc + t.points, 0);

  const carlaPointsEl = document.getElementById("carlaPoints");
  const jordiPointsEl = document.getElementById("jordiPoints");
  const carlaDoneEl = document.getElementById("carlaDone");
  const jordiDoneEl = document.getElementById("jordiDone");

  if (carlaPointsEl) carlaPointsEl.textContent = `${carlaPoints} pts`;
  if (jordiPointsEl) jordiPointsEl.textContent = `${jordiPoints} pts`;
  if (carlaDoneEl) carlaDoneEl.textContent = `${carlaDoneTasks.length} tareas hechas`;
  if (jordiDoneEl) jordiDoneEl.textContent = `${jordiDoneTasks.length} tareas hechas`;

  const totalCarla = availability.reduce((acc, day) => acc + Number(day.carla), 0);
  const totalJordi = availability.reduce((acc, day) => acc + Number(day.jordi), 0);

  const carlaHours = document.getElementById("carlaHours");
  const jordiHours = document.getElementById("jordiHours");

  if (carlaHours) carlaHours.textContent = `${totalCarla}h disponibles`;
  if (jordiHours) jordiHours.textContent = `${totalJordi}h disponibles`;

  const today = new Date();
  const currentDate = document.getElementById("currentDate");
  if (currentDate) {
    currentDate.textContent = today.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short"
    });
  }

  const welcomeTitle = document.getElementById("welcomeTitle");
  const todayStatsText = document.getElementById("todayStatsText");
  const todayText = document.getElementById("todayText");

  const myTasks = tasks.filter(
    t => (t.assignedTo === currentUser || t.assignedTo === "shared") && t.status === "pending"
  );
  const myPendingCount = myTasks.length;
  const myPendingMinutes = myTasks.reduce((acc, t) => acc + t.duration, 0);

  if (welcomeTitle) {
    welcomeTitle.textContent = `Hola, ${currentUser}`;
  }

  if (todayStatsText) {
    if (myPendingCount === 0) {
      todayStatsText.textContent = "Hoy no tienes tareas pendientes";
    } else if (myPendingCount === 1) {
      todayStatsText.textContent = `Hoy tienes 1 tarea · ${myPendingMinutes} min estimados`;
    } else {
      todayStatsText.textContent = `Hoy tienes ${myPendingCount} tareas · ${myPendingMinutes} min estimados`;
    }
  }

  if (todayText) {
    todayText.textContent = "";
  }

  updateMonthlyProgress();
}

function renderCalendar() {
  const container = document.getElementById("calendarDays");
  if (!container) return;

  container.innerHTML = "";

  availability.forEach((item, index) => {
    const dayCard = document.createElement("div");
    dayCard.className = "day-card";

    dayCard.innerHTML = `
      <h3>${item.day}</h3>
      <div class="day-row">
        <label>Carla (horas)</label>
        <input type="number" min="0" max="24" value="${item.carla}" data-person="carla" data-index="${index}">
      </div>
      <div class="day-row">
        <label>Jordi (horas)</label>
        <input type="number" min="0" max="24" value="${item.jordi}" data-person="jordi" data-index="${index}">
      </div>
    `;

    container.appendChild(dayCard);
  });

  container.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", e => {
      const index = Number(e.target.dataset.index);
      const person = e.target.dataset.person;
      availability[index][person] = Number(e.target.value);
    });
  });
}

function renderHistory() {
  const historyList = document.getElementById("historyList");
  if (!historyList) return;

  historyList.innerHTML = "";

  if (history.length === 0) {
    historyList.innerHTML = `<div class="history-item"><p>Aún no hay movimientos guardados.</p></div>`;
    return;
  }

  history.forEach(item => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<p>${item.text}</p><p class="task-meta">${item.timestamp}</p>`;
    historyList.appendChild(div);
  });
}

async function organizeWithIA() {
  const totalCarlaMinutes = availability.reduce((acc, day) => acc + Number(day.carla), 0) * 60;
  const totalJordiMinutes = availability.reduce((acc, day) => acc + Number(day.jordi), 0) * 60;

  let assignedCarla = 0;
  let assignedJordi = 0;

  const pendingTasks = tasks.filter(task => task.status !== "done");

  pendingTasks.forEach(task => {
    const lower = task.title.toLowerCase();

    if (lower.includes("compra")) {
      task.assignedTo = "Carla";
      assignedCarla += task.duration;
      return;
    }

    if (
      lower.includes("barbacoa") ||
      lower.includes("basuras") ||
      lower.includes("deixallería") ||
      lower.includes("jardín") ||
      lower.includes("jardiner")
    ) {
      task.assignedTo = "Jordi";
      assignedJordi += task.duration;
      return;
    }

    const carlaRatio = totalCarlaMinutes > 0 ? assignedCarla / totalCarlaMinutes : 999;
    const jordiRatio = totalJordiMinutes > 0 ? assignedJordi / totalJordiMinutes : 999;

    if (carlaRatio <= jordiRatio) {
      task.assignedTo = "Carla";
      assignedCarla += task.duration;
    } else {
      task.assignedTo = "Jordi";
      assignedJordi += task.duration;
    }
  });

  history.unshift({
    text: `La IA reorganizó la semana: Carla ${assignedCarla} min asignados, Jordi ${assignedJordi} min asignados, teniendo en cuenta disponibilidad, preferencias e historial.`,
    timestamp: new Date().toLocaleString()
  });

  await saveAll();
  showToast("La IA ha reorganizado la semana");
}

function getWeekNumber(date) {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const pastDays = (date - firstDay) / 86400000;
  return Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
}

async function checkWeeklyAIReset() {
  const now = new Date();
  const currentWeek = getWeekNumber(now);

  const homeRef = getHomeRef();
  const snap = await getDoc(homeRef);

  if (!snap.exists()) return;

  const data = snap.data();
  const lastResetWeek = data.lastWeeklyReset;

  if (lastResetWeek !== currentWeek) {
    await organizeWithIA();

    await setDoc(homeRef, {
      lastWeeklyReset: currentWeek
    }, { merge: true });

    history.unshift({
      text: "La IA reorganizó automáticamente la nueva semana.",
      timestamp: new Date().toLocaleString()
    });

    await saveAll();
  }
}

function generateReward() {
  const monthlyGoal = 20;

  const totalDonePoints = tasks
    .filter(task => task.status === "done")
    .reduce((acc, task) => acc + task.points, 0);

  if (totalDonePoints < monthlyGoal) {
    document.getElementById("rewardTitle").textContent = "Todavía no habéis desbloqueado la recompensa";
    document.getElementById("rewardText").textContent = "Necesitáis llegar a 20 puntos para generar vuestro plan especial del mes.";
    return;
  }

  const randomReward = rewardIdeas[Math.floor(Math.random() * rewardIdeas.length)];
  document.getElementById("rewardTitle").textContent = randomReward.title;
  document.getElementById("rewardText").textContent = randomReward.text;
}

function setupNavigation() {
  const navButtons = document.querySelectorAll(".nav-btn");
  const screens = document.querySelectorAll(".screen");

  navButtons.forEach(button => {
    button.addEventListener("click", () => {
      const target = button.dataset.screen;

      navButtons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");

      screens.forEach(screen => screen.classList.remove("active"));
      document.getElementById(`screen-${target}`).classList.add("active");
    });
  });
}

function setupTabs() {
  const tabs = document.querySelectorAll(".tab");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      renderTasks(tab.dataset.filter);
    });
  });
}

function getActiveFilter() {
  const activeTab = document.querySelector(".tab.active");
  return activeTab ? activeTab.dataset.filter : "all";
}

function openModal() {
  const modal = document.getElementById("taskModal");
  if (modal) modal.style.display = "flex";
}

function closeModal() {
  const modal = document.getElementById("taskModal");
  if (modal) modal.style.display = "none";
}

async function saveTaskFromModal() {
  const title = document.getElementById("taskTitle").value.trim();
  const category = document.getElementById("taskCategory").value;
  const assignedTo = document.getElementById("taskAssigned").value;
  const duration = Number(document.getElementById("taskDuration").value);

  if (!title) {
    alert("Escribe un nombre para la tarea");
    return;
  }

  const newTask = {
    id: Date.now(),
    title,
    category,
    assignedTo,
    duration: duration > 0 ? duration : 20,
    priority: "media",
    status: "pending",
    points: 5
  };

  tasks.unshift(newTask);

  history.unshift({
    text: `Se añadió la tarea "${title}"`,
    timestamp: new Date().toLocaleString()
  });

  await saveAll();
  showToast(`Nueva tarea añadida: ${title}`);
  closeModal();

  document.getElementById("taskTitle").value = "";
  document.getElementById("taskCategory").value = "daily";
  document.getElementById("taskAssigned").value = "Carla";
  document.getElementById("taskDuration").value = 20;
}

document.getElementById("explainBtn").addEventListener("click", () => {
  document.getElementById("aiExplanation").classList.toggle("hidden");
});

document.getElementById("aiOrganizeBtn").addEventListener("click", organizeWithIA);

document.getElementById("saveAvailabilityBtn").addEventListener("click", async () => {
  await saveAll();
  updateSummary();
});

document.getElementById("generateRewardBtn").addEventListener("click", generateReward);
document.getElementById("addTaskBtn").addEventListener("click", openModal);
document.getElementById("closeModalBtn").addEventListener("click", closeModal);
document.getElementById("saveTaskBtn").addEventListener("click", saveTaskFromModal);

setupNavigation();
setupTabs();
renderTasks();
renderCalendar();
renderHistory();

window.addEventListener("load", async () => {
  setupUserSelection();
  currentUser = localStorage.getItem("casaEnCalmaUser");
  await initializeSharedData();
  await checkWeeklyAIReset();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .then(() => console.log("Service Worker registrado"))
      .catch(error => console.log("Error al registrar el Service Worker:", error));
  });
}