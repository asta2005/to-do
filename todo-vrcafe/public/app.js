// ----- Config -----
const STORAGE_KEY = "vrcafe_tasks";

const categories = {
  work: { id: "work", label: "Werk", pillClass: "task-category-pill--work" },
  personal: {
    id: "personal",
    label: "Persoonlijk",
    pillClass: "task-category-pill--personal",
  },
  free: { id: "free", label: "Vrije tijd", pillClass: "task-category-pill--free" },
};

let tasks = [];
let currentFilter = "all"; // all | active | completed
let currentSort = "newest"; // newest | oldest | az

// ----- Helpers -----
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    tasks = raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Kon taken niet laden:", e);
    tasks = [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function createTask(title, categoryId, date) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    title: title.trim(),
    category: categoryId,
    completed: false,
    createdAt: Date.now(),
    dueDate: date || null,
  };
}

function formatDate(timestampOrString) {
  if (!timestampOrString) return "";
  try {
    const d =
      typeof timestampOrString === "number"
        ? new Date(timestampOrString)
        : new Date(timestampOrString);
    return d.toLocaleDateString("nl-NL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

// ----- Rendering -----
const taskListEl = document.getElementById("task-list");

function renderTasks() {
  taskListEl.innerHTML = "";

  let filtered = tasks.slice();

  if (currentFilter === "active") {
    filtered = filtered.filter((t) => !t.completed);
  } else if (currentFilter === "completed") {
    filtered = filtered.filter((t) => t.completed);
  }

  if (currentSort === "newest") {
    filtered.sort((a, b) => b.createdAt - a.createdAt);
  } else if (currentSort === "oldest") {
    filtered.sort((a, b) => a.createdAt - b.createdAt);
  } else if (currentSort === "az") {
    filtered.sort((a, b) => a.title.localeCompare(b.title, "nl"));
  }

  filtered.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task-item task-item--enter";
    li.dataset.id = task.id;

    // categorie pill
    const pill = document.createElement("span");
    pill.className = `task-category-pill ${
      categories[task.category].pillClass
    }`;
    pill.textContent = categories[task.category].label;

    // titel + meta
    const titleWrapper = document.createElement("div");
    const title = document.createElement("span");
    title.className = "task-title";
    if (task.completed) title.classList.add("completed");
    title.textContent = task.title;

    const meta = document.createElement("span");
    meta.className = "task-meta";

    const parts = [];
    if (task.dueDate) parts.push(`Datum: ${formatDate(task.dueDate)}`);
    parts.push(`Toegevoegd: ${formatDate(task.createdAt)}`);
    meta.textContent = parts.join("  •  ");

    titleWrapper.appendChild(title);
    titleWrapper.appendChild(meta);

    // complete button
    const completeBtn = document.createElement("button");
    completeBtn.className = "icon-btn icon-btn--complete";
    if (task.completed) completeBtn.classList.add("completed");
    completeBtn.setAttribute("aria-label", "Taak voltooien");

    completeBtn.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.5 16.2 5.8 12.5 4.4 13.9 9.5 19 20 8.5 18.6 7.1z"></path></svg>';

    // delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "icon-btn icon-btn--delete";
    deleteBtn.setAttribute("aria-label", "Taak verwijderen");
    deleteBtn.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 3h6l1 2h4v2h-2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7H3V5h4l1-2zm0 4v11h2V7H9zm4 0v11h2V7h-2z"></path></svg>';

    li.appendChild(pill);
    li.appendChild(titleWrapper);
    li.appendChild(completeBtn);
    li.appendChild(deleteBtn);

    taskListEl.appendChild(li);
  });

  updateProgress();
}

function updateProgress() {
  const counts = {
    work: { total: 0, completed: 0 },
    personal: { total: 0, completed: 0 },
    free: { total: 0, completed: 0 },
  };

  tasks.forEach((t) => {
    counts[t.category].total++;
    if (t.completed) counts[t.category].completed++;
  });

  const progressMap = {
    work: document.getElementById("progress-work"),
    personal: document.getElementById("progress-personal"),
    free: document.getElementById("progress-free"),
  };

  Object.keys(counts).forEach((key) => {
    const { completed, total } = counts[key];
    progressMap[key].textContent = `${completed}/${total}`;
  });
}

// ----- Event handlers -----
document.addEventListener("DOMContentLoaded", () => {
  loadTasks();
  renderTasks();

  const form = document.getElementById("task-form");
  const titleInput = document.getElementById("task-title");
  const categorySelect = document.getElementById("task-category");
  const dateInput = document.getElementById("task-date");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    if (!title) return;

    const category = categorySelect.value;
    const date = dateInput.value || null;

    const task = createTask(title, category, date);
    tasks.push(task);
    saveTasks();
    renderTasks();

    form.reset();
    categorySelect.value = category; // behoud laatste gekozen categorie
  });

  // filter knoppen
  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      document
        .querySelectorAll("[data-filter]")
        .forEach((b) => b.classList.remove("chip--active"));
      btn.classList.add("chip--active");
      renderTasks();
    });
  });

  // sortering
  const sortSelect = document.getElementById("sort-select");
  sortSelect.addEventListener("change", () => {
    currentSort = sortSelect.value;
    renderTasks();
  });

  // taak acties (event delegation)
  taskListEl.addEventListener("click", (e) => {
    const li = e.target.closest(".task-item");
    if (!li) return;
    const id = li.dataset.id;
    const taskIndex = tasks.findIndex((t) => t.id === id);
    if (taskIndex === -1) return;

    if (e.target.closest(".icon-btn--complete")) {
      tasks[taskIndex].completed = !tasks[taskIndex].completed;
      saveTasks();
      renderTasks();
    }

    if (e.target.closest(".icon-btn--delete")) {
      // animatie bij verwijderen
      li.classList.add("task-item--removing");
      setTimeout(() => {
        tasks.splice(taskIndex, 1);
        saveTasks();
        renderTasks();
      }, 220);
    }
  });
});
