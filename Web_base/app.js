const defaultProjects = [
  { id: 1, name: 'My App', path: '/workspace/my-app', favorite: true, tags: ['app', 'react'], gitBranch: 'main', repoStatus: 'clean', comments: [] },
  { id: 2, name: 'API Service', path: '/workspace/api-service', favorite: true, tags: ['backend'], gitBranch: 'develop', repoStatus: 'dirty', comments: [] },
];

const defaultTickets = [
  { id: 101, ticketId: 'EPIC-001', title: 'Application foundation', projectId: 1, sprint: 'Sprint 1', ticketType: 'Epic', parentId: null, order: 0, assignee: 'Alice', status: 'doing' },
  { id: 102, ticketId: 'TASK-001', title: 'Documentation', projectId: 1, sprint: 'Sprint 1', ticketType: 'Task', parentId: 101, order: 0, assignee: 'Bob', status: 'todo' },
  { id: 103, ticketId: 'FEAT-001', title: 'API endpoints', projectId: 2, sprint: '', ticketType: 'Feature', parentId: null, order: 0, assignee: '', status: 'done' },
];

const defaultSprints = [
  { id: 1, name: 'Sprint 1', startDate: '2026-09-01', endDate: '2026-09-14', projectId: 1 },
  { id: 2, name: 'Sprint 2', startDate: '2026-09-15', endDate: '2026-09-28', projectId: 2 },
];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

const state = {
  projects: [...defaultProjects],
  tickets: [...defaultTickets],
  sprints: [...defaultSprints],
  recentIds: [1, 2],
  route: window.location.hash === '#favorites' ? 'favorites' : window.location.hash === '#recent' ? 'recent' : window.location.hash === '#tickets' ? 'tickets' : window.location.hash === '#board' ? 'board' : window.location.hash === '#schedule' ? 'schedule' : 'projects',
  selectedProjectId: 1,
  theme: 'dark',
  search: '',
  selectedTag: 'all',
  favoriteOnly: false,
  sortMode: 'saved',
  ticketDraft: null,
  ticketProjectId: null,
  boardProjectId: null,
  boardSprint: 'all',
  boardTicketId: null,
  ticketComposerOpen: false,
  sprintDraft: null,
};

const projectView = document.getElementById('projectView');
const ticketView = document.getElementById('ticketView');
const boardView = document.getElementById('boardView');
const scheduleView = document.getElementById('scheduleView');
const detailPanel = document.getElementById('detailPanel');
const recentList = document.getElementById('recentList');

function readLocalFallback() {
  const projects = localStorage.getItem('projectManagerProjects');
  const tickets = localStorage.getItem('projectManagerTickets');
  const sprints = localStorage.getItem('projectManagerSprints');
  const recent = localStorage.getItem('projectManagerRecent');

  state.projects = projects ? JSON.parse(projects) : defaultProjects;
  state.tickets = tickets ? JSON.parse(tickets) : defaultTickets;
  state.sprints = sprints ? JSON.parse(sprints) : defaultSprints;
  state.recentIds = recent ? JSON.parse(recent) : [1, 2];
  state.selectedProjectId = state.projects[0]?.id ?? null;
}

async function fetchJson(action) {
  try {
    const response = await fetch(`api.php?action=${action}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Bad response');
    }
    const payload = await response.json();
    return Array.isArray(payload?.data) ? payload.data : [];
  } catch (error) {
    return [];
  }
}

async function loadData() {
  const [projects, tickets, sprints, recent] = await Promise.all([
    fetchJson('projects'),
    fetchJson('tickets'),
    fetchJson('sprints'),
    fetchJson('recent'),
  ]);

  if (projects.length) {
    state.projects = projects;
  } else {
    readLocalFallback();
  }

  if (tickets.length) {
    state.tickets = tickets;
  } else {
    state.tickets = state.tickets.length ? state.tickets : defaultTickets;
  }

  if (sprints.length) {
    state.sprints = sprints;
  } else {
    state.sprints = state.sprints.length ? state.sprints : defaultSprints;
  }

  if (recent.length) {
    state.recentIds = recent;
  } else {
    state.recentIds = state.recentIds.length ? state.recentIds : [1, 2];
  }

  state.selectedProjectId = state.projects[0]?.id ?? null;
  persistLocalFallback();
  render();
}

function persistLocalFallback() {
  localStorage.setItem('projectManagerProjects', JSON.stringify(state.projects));
  localStorage.setItem('projectManagerTickets', JSON.stringify(state.tickets));
  localStorage.setItem('projectManagerSprints', JSON.stringify(state.sprints));
  localStorage.setItem('projectManagerRecent', JSON.stringify(state.recentIds));
}

async function saveProjectState() {
  try {
    await fetch('api.php?action=save-projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: state.projects }),
    });
  } catch (error) {
    console.warn('PHP API unavailable; using localStorage fallback.', error);
  }

  persistLocalFallback();
}

async function saveTicketState() {
  try {
    await fetch('api.php?action=save-tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: state.tickets }),
    });
  } catch (error) {
    console.warn('Ticket save fallback used.', error);
  }

  persistLocalFallback();
}

async function saveSprintState() {
  try {
    await fetch('api.php?action=save-sprints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: state.sprints }),
    });
  } catch (error) {
    console.warn('Sprint save fallback used.', error);
  }

  persistLocalFallback();
}

async function saveRecentState() {
  try {
    await fetch('api.php?action=save-recent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: state.recentIds }),
    });
  } catch (error) {
    console.warn('Recent project save fallback used.', error);
  }

  persistLocalFallback();
}

function getSelectedProject() {
  return state.projects.find((project) => project.id === state.selectedProjectId) ?? state.projects[0] ?? null;
}

function createTicketId(ticketType) {
  const prefixes = { Bug: 'BUG', Feature: 'FEAT', Task: 'TASK', Story: 'STORY', Epic: 'EPIC' };
  const prefix = prefixes[ticketType] || 'TASK';
  const numbers = state.tickets
    .map((ticket) => ticket.ticketId?.match(new RegExp(`^${prefix}-(\\d+)$`))?.[1])
    .filter(Boolean)
    .map(Number);
  const nextNumber = numbers.length ? Math.max(...numbers) + 1 : 1;
  return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
}

function ticketTypeIcon(ticketType) {
  return { Epic: '◆', Feature: '✦', Bug: '⚠', Story: '●', Task: '✓' }[ticketType] || '✓';
}

function ticketStatusLabel(status) {
  const labels = { todo: 'todo', doing: 'doing', done: 'done' };
  const normalized = labels[status] ? status : 'todo';
  return `<span class="ticket-status ticket-status-${normalized}">${labels[normalized]}</span>`;
}

function buildTicketRows(tickets) {
  const childrenByParent = new Map();
  tickets.forEach((ticket) => {
    const parentId = ticket.parentId == null || ticket.parentId === '' ? null : Number(ticket.parentId);
    childrenByParent.set(parentId, [...(childrenByParent.get(parentId) || []), ticket]);
  });
  const rows = [];
  const visit = (ticket, depth, visited) => {
    if (visited.has(ticket.id)) return;
    rows.push({ ticket, depth });
    const nextVisited = new Set(visited).add(ticket.id);
    (childrenByParent.get(ticket.id) || [])
      .sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title))
      .forEach((child) => visit(child, depth + 1, nextVisited));
  };
  (childrenByParent.get(null) || [])
    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title))
    .forEach((ticket) => visit(ticket, 0, new Set()));
  tickets.filter((ticket) => !rows.some((row) => row.ticket.id === ticket.id)).forEach((ticket) => visit(ticket, 0, new Set()));
  return rows;
}

function getFilteredProjects() {
  const search = state.search.trim().toLowerCase();
  const filtered = state.projects.filter((project) => {
    const matchesRoute = state.route === 'favorites'
      ? project.favorite
      : state.route === 'recent'
        ? state.recentIds.includes(project.id)
        : true;
    const matchesSearch = !search || `${project.name} ${project.path} ${project.tags.join(' ')}`.toLowerCase().includes(search);
    const matchesTag = state.selectedTag === 'all' || project.tags.includes(state.selectedTag);
    const matchesFavorite = !state.favoriteOnly || project.favorite;
    return matchesRoute && matchesSearch && matchesTag && matchesFavorite;
  });
  const recentIndex = new Map(state.recentIds.map((id, index) => [id, index]));
  return filtered.sort((a, b) => {
    if (state.sortMode === 'name') return a.name.localeCompare(b.name);
    if (state.sortMode === 'path') return a.path.localeCompare(b.path);
    if (state.sortMode === 'recent') return (recentIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (recentIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER);
    return 0;
  });
}

function renderRecentList() {
  const recentProjects = state.recentIds
    .map((id) => state.projects.find((project) => project.id === id))
    .filter(Boolean);

  recentList.innerHTML = recentProjects.length
    ? recentProjects.map((project) => `
      <li><button type="button" data-project-id="${escapeHtml(project.id)}">${escapeHtml(project.name)}</button></li>
    `).join('')
    : '<li class="empty">No recent projects</li>';

  recentList.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedProjectId = Number(button.dataset.projectId);
      state.route = 'projects';
      render();
    });
  });
}

function renderSidebar() {
  document.querySelectorAll('.nav-button').forEach((button) => {
    const isActive = button.dataset.route === state.route;
    button.classList.toggle('active', isActive);
  });
}

function renderProjectList() {
  const projects = getFilteredProjects();
  const allTags = [...new Set(state.projects.flatMap((project) => project.tags || []))].sort();

  const tagButtons = ['all', ...allTags].map((tag) => `
    <button class="filter-tag ${state.selectedTag === tag ? 'selected' : ''}" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>
  `).join('');

  projectView.innerHTML = `
    <div class="panel-header">
      <div>
        <h2>${state.route === 'favorites' ? 'Favorites' : state.route === 'recent' ? 'Recent projects' : 'Projects'}</h2>
        <p class="subtle">${projects.length} items</p>
      </div>
      <div class="toolbar">
        <input id="projectSearch" type="search" placeholder="Search projects" value="${escapeHtml(state.search)}" />
        <select id="projectSort"><option value="saved" ${state.sortMode === 'saved' ? 'selected' : ''}>Saved</option><option value="name" ${state.sortMode === 'name' ? 'selected' : ''}>Name</option><option value="path" ${state.sortMode === 'path' ? 'selected' : ''}>Path</option><option value="recent" ${state.sortMode === 'recent' ? 'selected' : ''}>Recent</option></select>
        <button id="addProjectButton" class="primary-button">+ Add project</button>
      </div>
    </div>
    <div class="action-row">
      <button id="browseFolderButton" type="button" class="secondary-button">Browse folder</button>
      <button id="importProjectsButton" type="button" class="secondary-button">Import JSON</button>
      <button id="exportProjectsButton" type="button" class="secondary-button">Export JSON</button>
      <input id="folderInput" type="file" webkitdirectory hidden />
      <input id="projectImportInput" type="file" accept=".json,application/json" hidden />
    </div>
    <div class="filter-row">${tagButtons}</div>
    <div class="project-grid">
      ${projects.map((project) => `
        <article class="project-card ${project.id === state.selectedProjectId ? 'selected' : ''}" data-project-id="${escapeHtml(project.id)}">
          <div class="project-card-head">
            <strong>${escapeHtml(project.name)}</strong>
            <button type="button" class="icon-button star ${project.favorite ? 'active' : ''}" data-favorite-id="${escapeHtml(project.id)}">${project.favorite ? '★' : '☆'}</button>
          </div>
          <p>${escapeHtml(project.path)}</p>
          <div class="tag-list">${(project.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
          <div class="card-actions">
            <button type="button" data-select-id="${escapeHtml(project.id)}">Open</button>
            <button type="button" data-delete-id="${escapeHtml(project.id)}" class="danger">Delete</button>
          </div>
        </article>
      `).join('') || '<p class="empty-state">No matching projects</p>'}
    </div>
  `;

  document.getElementById('projectSearch').addEventListener('input', (event) => {
    state.search = event.target.value;
    render();
  });

  document.getElementById('projectSort').addEventListener('change', (event) => {
    state.sortMode = event.target.value;
    render();
  });

  document.getElementById('browseFolderButton').addEventListener('click', () => document.getElementById('folderInput').click());
  document.getElementById('folderInput').addEventListener('change', (event) => {
    const firstFile = event.target.files?.[0];
    const folderPath = firstFile?.webkitRelativePath?.split('/')[0] || '';
    const name = folderPath || 'New project';
    const project = { id: Date.now(), name, path: folderPath, favorite: false, tags: [], gitBranch: 'main', repoStatus: 'unknown', comments: [] };
    state.projects = [project, ...state.projects];
    state.selectedProjectId = project.id;
    saveProjectState();
    render();
  });
  document.getElementById('importProjectsButton').addEventListener('click', () => document.getElementById('projectImportInput').click());
  document.getElementById('projectImportInput').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      const projects = Array.isArray(imported) ? imported : imported.data;
      if (!Array.isArray(projects)) return;
      state.projects = projects.map((project, index) => ({ ...project, id: project.id ?? Date.now() + index, tags: project.tags || [], comments: project.comments || [] }));
      state.selectedProjectId = state.projects[0]?.id ?? null;
      saveProjectState();
      render();
    } catch (error) {
      console.warn('Unable to import projects.', error);
    }
  });
  document.getElementById('exportProjectsButton').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state.projects, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'projects.json';
    link.click();
    URL.revokeObjectURL(link.href);
  });

  document.getElementById('addProjectButton').addEventListener('click', () => {
    const name = window.prompt('Project name');
    if (!name) return;
    const path = window.prompt('Project path', '/workspace/project');
    const newProject = {
      id: Date.now(),
      name,
      path: path || '',
      favorite: false,
      tags: [],
      gitBranch: 'main',
      repoStatus: 'clean',
      comments: [],
    };
    state.projects = [newProject, ...state.projects];
    state.selectedProjectId = newProject.id;
    saveProjectState();
    render();
  });

  projectView.querySelectorAll('[data-select-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedProjectId = Number(button.dataset.selectId);
      state.recentIds = [state.selectedProjectId, ...state.recentIds.filter((id) => id !== state.selectedProjectId)].slice(0, 10);
      saveRecentState();
      state.route = 'projects';
      render();
    });
  });

  projectView.querySelectorAll('[data-delete-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.deleteId);
      state.projects = state.projects.filter((project) => project.id !== id);
      state.tickets = state.tickets.filter((ticket) => ticket.projectId !== id);
      state.sprints = state.sprints.filter((sprint) => sprint.projectId !== id);
      state.recentIds = state.recentIds.filter((value) => value !== id);
      if (state.selectedProjectId === id) {
        state.selectedProjectId = state.projects[0]?.id ?? null;
      }
      saveProjectState();
      saveTicketState();
      saveSprintState();
      render();
    });
  });

  projectView.querySelectorAll('[data-favorite-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.favoriteId);
      state.projects = state.projects.map((project) =>
        project.id === id ? { ...project, favorite: !project.favorite } : project
      );
      saveProjectState();
      render();
    });
  });

  projectView.querySelectorAll('.filter-tag').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedTag = button.dataset.tag;
      render();
    });
  });

  projectView.querySelectorAll('.project-card').forEach((card) => {
    card.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      const id = Number(card.dataset.projectId);
      state.selectedProjectId = id;
      render();
    });
  });
}

function renderDetailPanel() {
  const showsDetailPanel = ['projects', 'favorites', 'recent'].includes(state.route)
    || (state.route === 'tickets' && state.ticketComposerOpen)
    || (state.route === 'board' && state.boardTicketId != null);
  detailPanel.classList.toggle('hidden', !showsDetailPanel);
  if (!showsDetailPanel) return;

  if (state.route === 'tickets' || state.route === 'board') {
    if (state.route === 'board' && state.boardTicketId != null && !state.ticketDraft) {
      const ticket = state.tickets.find((item) => item.id === state.boardTicketId);
      state.ticketDraft = ticket ? { ...ticket, title: ticket.title || ticket.name || '' } : null;
    }
    renderTicketComposer();
    return;
  }

  const project = getSelectedProject();
  if (!project) {
    detailPanel.innerHTML = '<p class="empty-state">No project selected</p>';
    return;
  }

  detailPanel.innerHTML = `
    <div class="detail-card">
      <p class="modal-kicker">Project</p>
      <h3>Project details</h3>
      <form id="projectDetailForm" class="project-detail-form">
        <label>Name<input name="name" value="${escapeHtml(project.name)}" required /></label>
        <label>Path<input name="path" value="${escapeHtml(project.path)}" /></label>
        <label>Tags<input name="tags" value="${escapeHtml((project.tags || []).join(', '))}" placeholder="app, react" /></label>
        <label>Git branch<input name="gitBranch" value="${escapeHtml(project.gitBranch || '')}" /></label>
        <label>Repo status<select name="repoStatus"><option value="clean" ${project.repoStatus === 'clean' ? 'selected' : ''}>Clean</option><option value="dirty" ${project.repoStatus === 'dirty' ? 'selected' : ''}>Dirty</option><option value="unknown" ${project.repoStatus === 'unknown' ? 'selected' : ''}>Unknown</option></select></label>
        <div class="detail-actions">
          <button type="submit" class="primary-button">Save changes</button>
          <button type="button" id="openProjectButton" class="secondary-button">Open folder</button>
          <button type="button" id="toggleFavoriteButton" class="secondary-button">${project.favorite ? 'Unfavorite' : 'Favorite'}</button>
        </div>
      </form>
      <div class="comment-box">
        <h4>Comments</h4>
        ${(project.comments || []).length ? project.comments.map((comment) => `<p class="comment">${escapeHtml(comment.text)}</p>`).join('') : '<p class="empty-state">No comments yet.</p>'}
      </div>
      <div class="comment-form">
        <textarea id="commentInput" rows="3" placeholder="Add a comment..."></textarea>
        <button id="addCommentButton" class="primary-button">Save comment</button>
      </div>
    </div>
  `;

  document.getElementById('projectDetailForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    state.projects = state.projects.map((item) => item.id === project.id ? {
      ...item,
      name: values.name.trim(),
      path: values.path.trim(),
      tags: values.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      gitBranch: values.gitBranch.trim(),
      repoStatus: values.repoStatus,
    } : item);
    saveProjectState();
    render();
  });

  document.getElementById('openProjectButton').addEventListener('click', () => {
    try {
      const path = project.path.startsWith('http') ? project.path : `file://${project.path}`;
      window.open(path, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Unable to open project path', error);
    }
  });

  document.getElementById('toggleFavoriteButton').addEventListener('click', () => {
    state.projects = state.projects.map((item) =>
      item.id === project.id ? { ...item, favorite: !item.favorite } : item
    );
    saveProjectState();
    render();
  });

  document.getElementById('addCommentButton').addEventListener('click', () => {
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    if (!text) return;

    state.projects = state.projects.map((item) =>
      item.id === project.id
        ? { ...item, comments: [...(item.comments || []), { id: Date.now(), text }] }
        : item
    );
    saveProjectState();
    render();
  });
}

function renderTicketComposer() {
  const defaultDraft = {
    id: null,
    projectId: state.selectedProjectId ?? state.projects[0]?.id ?? '',
    ticketId: '',
    title: '',
    sprint: '',
    startDate: '',
    endDate: '',
    ticketType: 'Task',
    parentId: '',
    assignee: '',
  };
  const draft = { ...defaultDraft, ...(state.ticketDraft || {}) };
  const parentTickets = state.tickets.filter((ticket) => ticket.id !== draft.id && Number(ticket.projectId) === Number(draft.projectId));

  detailPanel.innerHTML = `
    <div class="detail-card ticket-composer">
      <p class="modal-kicker">Ticket</p>
      <h3>${draft.id ? 'Edit ticket' : 'Create ticket'}</h3>
      <p class="subtle">${draft.id ? 'Update the selected ticket.' : 'Add a ticket without leaving the ticket list.'}</p>
      <form id="ticketComposerForm" class="ticket-composer-form">
        <label>Project
          <select name="projectId" required>
            <option value="">Select a project</option>
            ${state.projects.map((project) => `<option value="${escapeHtml(project.id)}" ${Number(draft.projectId) === project.id ? 'selected' : ''}>${escapeHtml(project.name)}</option>`).join('')}
          </select>
        </label>
        <label>Ticket ID
           <input name="ticketId" value="${escapeHtml(draft.ticketId)}" placeholder="Auto-generated" />
        </label>
        <label>Title
           <input name="title" value="${escapeHtml(draft.title)}" placeholder="What needs to be done?" required />
        </label>
        <label>Type
          <select name="ticketType">
            ${['Task', 'Feature', 'Bug', 'Epic'].map((type) => `<option value="${type}" ${draft.ticketType === type ? 'selected' : ''}>${type}</option>`).join('')}
          </select>
        </label>
        <label>Sprint
           <input name="sprint" value="${escapeHtml(draft.sprint)}" placeholder="Sprint 1" />
        </label>
        <label>Start date
           <input name="startDate" type="date" value="${escapeHtml(draft.startDate || '')}" />
        </label>
        <label>End date
           <input name="endDate" type="date" min="${escapeHtml(draft.startDate || '')}" value="${escapeHtml(draft.endDate || '')}" />
        </label>
        <label>Parent ticket
           <select name="parentId"><option value="">No parent</option>${parentTickets.map((ticket) => `<option value="${escapeHtml(ticket.id)}" ${String(draft.parentId || '') === String(ticket.id) ? 'selected' : ''}>${escapeHtml(ticket.ticketId || 'No ID')} - ${escapeHtml(ticket.title)}</option>`).join('')}</select>
        </label>
        <label>Assignee
           <input name="assignee" value="${escapeHtml(draft.assignee)}" placeholder="Assignee" />
        </label>
        <div class="detail-actions">
          <button type="submit" class="primary-button">${draft.id ? 'Save ticket' : 'Create ticket'}</button>
          <button type="button" id="clearTicketComposer" class="secondary-button">Clear</button>
        </div>
      </form>
    </div>
  `;

  const form = document.getElementById('ticketComposerForm');
  form.addEventListener('input', () => {
    const values = new FormData(form);
    state.ticketDraft = Object.fromEntries(values.entries());
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form).entries());
    if (!values.projectId || !values.title.trim()) return;

    if (values.endDate && values.startDate && values.endDate < values.startDate) return;

    const ticket = {
      id: draft.id || Date.now(),
      ticketId: values.ticketId.trim() || (draft.id ? draft.ticketId : createTicketId(values.ticketType)),
      title: values.title.trim(),
      projectId: Number(values.projectId),
      sprint: values.sprint.trim(),
      startDate: values.startDate,
      endDate: values.endDate,
      ticketType: values.ticketType,
      parentId: values.parentId ? Number(values.parentId) : null,
      order: draft.order || 0,
      assignee: values.assignee.trim(),
      status: draft.status || 'todo',
    };

    state.tickets = draft.id
      ? state.tickets.map((item) => item.id === draft.id ? ticket : item)
      : [ticket, ...state.tickets];
    state.ticketDraft = null;
    state.boardTicketId = null;
    state.ticketComposerOpen = false;
    saveTicketState();
    render();
  });
  document.getElementById('clearTicketComposer').addEventListener('click', () => {
    state.ticketDraft = null;
    state.boardTicketId = null;
    state.ticketComposerOpen = false;
    if (state.route === 'board') render();
    else renderDetailPanel();
  });
}

function renderTicketList() {
  const projectMap = new Map(state.projects.map((project) => [project.id, project]));
  const visibleTickets = state.ticketProjectId
    ? state.tickets.filter((ticket) => Number(ticket.projectId) === Number(state.ticketProjectId))
    : state.tickets;
  const rows = buildTicketRows(visibleTickets).map(({ ticket, depth }) => `
    <tr class="ticket-tree-row" data-ticket-row="${escapeHtml(ticket.id)}" draggable="true">
      <td class="ticket-row-actions-cell">
        <div class="ticket-menu-wrap">
           <button type="button" class="ticket-menu-trigger" data-ticket-menu-trigger="${escapeHtml(ticket.id)}" aria-label="Open ticket actions">⋯</button>
           <div class="ticket-menu ticket-menu-row hidden" data-ticket-menu="${escapeHtml(ticket.id)}">
             <button type="button" data-add-ticket="${escapeHtml(ticket.id)}">Add ticket</button>
             <button type="button" data-edit-ticket="${escapeHtml(ticket.id)}">Edit ticket</button>
             <button type="button" class="ticket-menu-danger" data-delete-ticket="${escapeHtml(ticket.id)}">Delete ticket</button>
          </div>
        </div>
      </td>
       <td class="ticket-reorder-target" data-reorder-target="${escapeHtml(ticket.id)}">${escapeHtml(ticket.ticketId)}</td>
       <td><span class="ticket-type-icon ticket-type-icon-${escapeHtml(String(ticket.ticketType || 'Task').toLowerCase())}" title="${escapeHtml(ticket.ticketType || 'Task')}">${ticketTypeIcon(ticket.ticketType)}</span><span style="display:inline-block; margin-left:${depth * 1.2}rem">${depth ? '└ ' : ''}${escapeHtml(ticket.title)}</span><button type="button" class="copy-text-button" data-copy-ticket="${escapeHtml(ticket.id)}">Copy</button></td>
       <td>${escapeHtml(projectMap.get(ticket.projectId)?.name || 'Unknown')}</td>
       <td>${escapeHtml(ticket.assignee || '-')}</td>
      <td>${ticketStatusLabel(ticket.status)}</td>
       <td>${escapeHtml(ticket.ticketType || 'Task')}</td>
       <td>${escapeHtml(ticket.sprint || 'Product Backlog')}</td>
    </tr>
  `).join('');

  ticketView.innerHTML = `
    <div class="panel-header">
      <div>
        <h2>Tickets</h2>
        <p class="subtle">${visibleTickets.length} of ${state.tickets.length} total</p>
      </div>
      <div class="toolbar">
         <select id="ticketProjectFilter"><option value="">All projects</option>${state.projects.map((project) => `<option value="${escapeHtml(project.id)}" ${String(state.ticketProjectId || '') === String(project.id) ? 'selected' : ''}>${escapeHtml(project.name)}</option>`).join('')}</select>
      </div>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th class="ticket-row-actions-cell">
              <div class="ticket-menu-wrap">
                <button type="button" class="ticket-menu-trigger ticket-menu-trigger-left" data-ticket-menu-trigger="header" aria-label="Open ticket actions">⋯</button>
                <div class="ticket-menu ticket-menu-header hidden" data-ticket-menu="header">
                  <button type="button" data-add-ticket="header">Add ticket</button>
                </div>
              </div>
            </th>
            <th>ID</th>
            <th>Title</th>
            <th>Project</th>
            <th>Assignee</th>
            <th>Status</th>
            <th>Type</th>
            <th>Sprint</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  document.getElementById('ticketProjectFilter').addEventListener('change', (event) => {
    state.ticketProjectId = event.target.value ? Number(event.target.value) : null;
    render();
  });

  ticketView.querySelectorAll('[data-ticket-menu-trigger]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const menu = ticketView.querySelector(`[data-ticket-menu="${button.dataset.ticketMenuTrigger}"]`);
      const wasHidden = menu.classList.contains('hidden');
      ticketView.querySelectorAll('[data-ticket-menu]').forEach((item) => item.classList.add('hidden'));
      if (wasHidden) {
        menu.classList.remove('hidden');
        const buttonRect = button.getBoundingClientRect();
        const menuHeight = menu.offsetHeight;
        const top = buttonRect.bottom + 6 + menuHeight <= window.innerHeight
          ? buttonRect.bottom + 6
          : Math.max(8, buttonRect.top - menuHeight - 6);
        menu.style.top = `${top}px`;
        menu.style.left = `${Math.max(8, buttonRect.left)}px`;
      }
    });
  });

  ticketView.querySelectorAll('[data-add-ticket]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const sourceTicket = state.tickets.find((ticket) => ticket.id === Number(button.dataset.addTicket));
      state.ticketDraft = sourceTicket ? { projectId: sourceTicket.projectId, parentId: sourceTicket.id } : null;
      state.ticketComposerOpen = true;
      renderDetailPanel();
      document.querySelector('.ticket-composer input[name="title"]')?.focus();
    });
  });

  let draggedTicketId = null;
  const clearTicketDropHighlights = () => {
    ticketView.querySelectorAll('.ticket-drop-target, .ticket-drop-target-reorder, .ticket-drop-target-child').forEach((element) => {
      element.classList.remove('ticket-drop-target', 'ticket-drop-target-reorder', 'ticket-drop-target-child');
    });
  };
  ticketView.querySelectorAll('[data-ticket-row]').forEach((row) => {
    row.addEventListener('dblclick', (event) => {
      if (event.target.closest('button, select, input, a')) return;
      const ticket = state.tickets.find((item) => item.id === Number(row.dataset.ticketRow));
      if (!ticket) return;
      state.ticketDraft = { ...ticket, title: ticket.title || ticket.name || '' };
      state.ticketComposerOpen = true;
      renderDetailPanel();
    });
    row.addEventListener('dragstart', (event) => {
      draggedTicketId = Number(row.dataset.ticketRow);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/ticket-id', String(draggedTicketId));
    });
    row.addEventListener('dragover', (event) => {
      event.preventDefault();
      if (event.target.closest('[data-reorder-target]')) return;
      clearTicketDropHighlights();
      row.classList.add('ticket-drop-target', 'ticket-drop-target-child');
    });
    row.addEventListener('dragenter', (event) => {
      if (event.target.closest('[data-reorder-target]')) return;
      event.preventDefault();
      clearTicketDropHighlights();
      row.classList.add('ticket-drop-target', 'ticket-drop-target-child');
    });
    row.addEventListener('dragleave', (event) => {
      if (!row.contains(event.relatedTarget)) row.classList.remove('ticket-drop-target', 'ticket-drop-target-child');
    });
    row.addEventListener('drop', (event) => {
      event.preventDefault();
      const targetId = Number(row.dataset.ticketRow);
      if (!draggedTicketId || draggedTicketId === targetId) return;
      const target = state.tickets.find((ticket) => ticket.id === targetId);
      const isDescendant = (parentId, childId) => state.tickets.some((ticket) => Number(ticket.parentId) === parentId && (ticket.id === childId || isDescendant(ticket.id, childId)));
      if (target && !isDescendant(draggedTicketId, targetId)) {
        state.tickets = state.tickets.map((ticket) => ticket.id === draggedTicketId ? { ...ticket, parentId: targetId, order: 0 } : ticket);
        saveTicketState();
        render();
      }
      draggedTicketId = null;
      clearTicketDropHighlights();
    });
  });

  ticketView.querySelectorAll('[data-reorder-target]').forEach((targetCell) => {
    targetCell.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.stopPropagation();
      clearTicketDropHighlights();
      targetCell.closest('[data-ticket-row]')?.classList.add('ticket-drop-target', 'ticket-drop-target-reorder');
    });
    targetCell.addEventListener('dragenter', (event) => {
      event.preventDefault();
      event.stopPropagation();
      clearTicketDropHighlights();
      targetCell.closest('[data-ticket-row]')?.classList.add('ticket-drop-target', 'ticket-drop-target-reorder');
    });
    targetCell.addEventListener('drop', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const targetId = Number(targetCell.dataset.reorderTarget);
      if (!draggedTicketId || draggedTicketId === targetId) return;
      const dragged = state.tickets.find((ticket) => ticket.id === draggedTicketId);
      const target = state.tickets.find((ticket) => ticket.id === targetId);
      if (!dragged || !target || (dragged.parentId || null) !== (target.parentId || null)) return;
      const siblings = state.tickets.filter((ticket) => (ticket.parentId || null) === (dragged.parentId || null)).sort((a, b) => (a.order || 0) - (b.order || 0));
      const reordered = siblings.filter((ticket) => ticket.id !== draggedTicketId);
      const targetIndex = reordered.findIndex((ticket) => ticket.id === targetId);
      reordered.splice(Math.max(0, targetIndex), 0, dragged);
      state.tickets = state.tickets.map((ticket) => {
        const index = reordered.findIndex((item) => item.id === ticket.id);
        return index >= 0 ? { ...ticket, order: index } : ticket;
      });
      saveTicketState();
      clearTicketDropHighlights();
      render();
    });
  });

  ticketView.querySelectorAll('[data-edit-ticket]').forEach((button) => {
    button.addEventListener('click', () => {
      const ticket = state.tickets.find((item) => item.id === Number(button.dataset.editTicket));
      if (!ticket) return;
      state.ticketDraft = { ...ticket, title: ticket.title || ticket.name || '' };
      state.ticketComposerOpen = true;
      renderDetailPanel();
    });
  });

  ticketView.querySelectorAll('[data-copy-ticket]').forEach((button) => {
    button.addEventListener('click', async () => {
      const ticket = state.tickets.find((item) => item.id === Number(button.dataset.copyTicket));
      if (!ticket) return;
      await navigator.clipboard?.writeText(`${ticket.ticketId || 'No ID'} · ${ticket.title}`);
      button.textContent = 'Copied';
      window.setTimeout(() => { button.textContent = 'Copy'; }, 1200);
    });
  });

  ticketView.querySelectorAll('[data-delete-ticket]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.deleteTicket);
      state.tickets = state.tickets.filter((ticket) => ticket.id !== id && ticket.parentId !== id);
      if (state.ticketDraft?.id === id) state.ticketDraft = null;
      saveTicketState();
      render();
    });
  });
}

function renderBoard() {
  const columns = ['parent', 'todo', 'doing', 'done'];
  const boardTickets = state.tickets.filter((ticket) => {
    const matchesProject = !state.boardProjectId || Number(ticket.projectId) === Number(state.boardProjectId);
    const sprint = (ticket.sprint || '').trim();
    const matchesSprint = state.boardSprint === 'all'
      || state.boardSprint === 'backlog' && !sprint
      || state.boardSprint === sprint;
    return matchesProject && matchesSprint;
  });
  const sprints = [...new Set(boardTickets.map((ticket) => (ticket.sprint || '').trim()).filter(Boolean))].sort();
  const columnHtml = columns.map((column) => {
    const columnTickets = column === 'parent'
      ? boardTickets.filter((ticket) => (ticket.parentId == null || ticket.parentId === '') && ticket.ticketType !== 'Epic')
      : boardTickets.filter((ticket) => ticket.status === column && ticket.parentId != null && ticket.parentId !== '');
    const title = column === 'parent' ? 'PARENT' : column.toUpperCase();
    return `
      <div class="kanban-column" data-board-column="${column}">
        <h3>${title}</h3>
        ${columnTickets.map((ticket) => `
           <div class="kanban-card" data-ticket-status="${escapeHtml(ticket.id)}" draggable="true" tabindex="0">
             <strong><span class="ticket-type-icon ticket-type-icon-${escapeHtml(String(ticket.ticketType || 'Task').toLowerCase())}" title="${escapeHtml(ticket.ticketType || 'Task')}">${ticketTypeIcon(ticket.ticketType)}</span> ${escapeHtml(ticket.ticketId)}</strong>
             <span>${escapeHtml(ticket.title)}</span>
          </div>
        `).join('') || '<p class="empty-state">No tickets</p>'}
      </div>
    `;
  }).join('');

  boardView.innerHTML = `
    <div class="panel-header">
      <div><h2>Board</h2><p class="subtle">${boardTickets.length} tickets</p></div>
      <div class="toolbar">
         <select id="boardProjectFilter"><option value="">All projects</option>${state.projects.map((project) => `<option value="${escapeHtml(project.id)}" ${String(state.boardProjectId || '') === String(project.id) ? 'selected' : ''}>${escapeHtml(project.name)}</option>`).join('')}</select>
         <select id="boardSprintFilter"><option value="all">All sprints</option><option value="backlog" ${state.boardSprint === 'backlog' ? 'selected' : ''}>Product Backlog</option>${sprints.map((sprint) => `<option value="${escapeHtml(sprint)}" ${state.boardSprint === sprint ? 'selected' : ''}>${escapeHtml(sprint)}</option>`).join('')}</select>
      </div>
    </div>
    <div class="kanban-grid">${columnHtml}</div>
  `;

  document.getElementById('boardProjectFilter').addEventListener('change', (event) => {
    state.boardProjectId = event.target.value ? Number(event.target.value) : null;
    state.boardSprint = 'all';
    render();
  });
  document.getElementById('boardSprintFilter').addEventListener('change', (event) => {
    state.boardSprint = event.target.value;
    render();
  });

  boardView.querySelectorAll('.kanban-card').forEach((card) => {
    const openTicketEditor = () => {
      state.boardTicketId = Number(card.dataset.ticketStatus);
      const ticket = state.tickets.find((item) => item.id === state.boardTicketId);
      state.ticketDraft = ticket ? { ...ticket, title: ticket.title || ticket.name || '' } : null;
      renderDetailPanel();
    };
    card.addEventListener('dblclick', openTicketEditor);
    card.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/ticket-id', card.dataset.ticketStatus);
    });
  });
  boardView.querySelectorAll('.kanban-column').forEach((column) => {
    column.addEventListener('dragover', (event) => {
      event.preventDefault();
      boardView.querySelectorAll('.kanban-drop-target').forEach((item) => item.classList.remove('kanban-drop-target'));
      column.classList.add('kanban-drop-target');
    });
    column.addEventListener('dragleave', (event) => {
      if (!column.contains(event.relatedTarget)) column.classList.remove('kanban-drop-target');
    });
    column.addEventListener('drop', (event) => {
      event.preventDefault();
      const id = Number(event.dataTransfer.getData('text/ticket-id'));
      const status = column.dataset.boardColumn;
      if (status === 'parent') {
        column.classList.remove('kanban-drop-target');
        return;
      }
      state.tickets = state.tickets.map((ticket) => ticket.id === id ? { ...ticket, status } : ticket);
      saveTicketState();
      column.classList.remove('kanban-drop-target');
      render();
    });
  });

}

function renderSchedule() {
  const draft = state.sprintDraft || {
    id: null,
    projectId: state.selectedProjectId ?? state.projects[0]?.id ?? '',
    name: '',
    startDate: '',
    endDate: '',
  };
  const dayMs = 24 * 60 * 60 * 1000;
  const parseDate = (value) => {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const renderSprintCalendar = (sprint) => {
    const startDate = parseDate(sprint.startDate);
    const endDate = parseDate(sprint.endDate);
     if (!startDate || !endDate || endDate < startDate) return `<div class="sprint-card"><strong>${escapeHtml(sprint.name)}</strong><p class="empty-state">Set valid sprint dates to show the timeline.</p></div>`;
    const days = [];
    for (let time = startDate.getTime(); time <= endDate.getTime(); time += dayMs) days.push(new Date(time));
    const tickets = state.tickets.filter((ticket) => Number(ticket.projectId) === Number(sprint.projectId) && ticket.sprint === sprint.name);
    const ticketRows = tickets.map((ticket, index) => {
      const ticketStart = parseDate(ticket.startDate) || new Date(startDate.getTime() + (index % days.length) * dayMs);
      const ticketEnd = parseDate(ticket.endDate) || ticketStart;
      const startOffset = Math.max(0, Math.min(days.length - 1, Math.round((ticketStart - startDate) / dayMs)));
      const endOffset = Math.max(startOffset, Math.min(days.length - 1, Math.round((ticketEnd - startDate) / dayMs)));
       return `<div class="schedule-row"><div class="schedule-label"><strong>${escapeHtml(ticket.ticketId || 'No ID')}</strong><span>${escapeHtml(ticket.title)}</span></div><div class="schedule-track"><span class="schedule-bar schedule-bar-${escapeHtml(String(ticket.ticketType || 'task').toLowerCase())}" style="grid-column:${startOffset + 1} / ${endOffset + 2}">${escapeHtml(ticket.title)}</span></div></div>`;
    }).join('');
     return `<section class="schedule-card"><header class="schedule-card-header"><div><p>${escapeHtml(state.projects.find((project) => project.id === sprint.projectId)?.name || 'Unknown project')}</p><h3>${escapeHtml(sprint.name)}</h3></div><span>${escapeHtml(sprint.startDate)} - ${escapeHtml(sprint.endDate)}</span></header><div class="schedule-grid" style="--schedule-days:${days.length}"><div class="schedule-label schedule-period-label">Date</div>${days.map((day) => `<div class="schedule-day">${day.getDate()}</div>`).join('')}${ticketRows || '<div class="schedule-empty">No tickets assigned to this sprint.</div>'}</div></section>`;
  };
  scheduleView.innerHTML = `
    <div class="panel-header">
      <h2>Schedule</h2>
    </div>
    <form id="sprintForm" class="sprint-form">
      <h3>${draft.id ? 'Edit sprint' : 'Add sprint'}</h3>
       <label>Project<select name="projectId" required>${state.projects.map((project) => `<option value="${escapeHtml(project.id)}" ${Number(draft.projectId) === project.id ? 'selected' : ''}>${escapeHtml(project.name)}</option>`).join('')}</select></label>
       <label>Name<input name="name" value="${escapeHtml(draft.name)}" placeholder="Sprint 1" required /></label>
       <label>Start date<input name="startDate" type="date" value="${escapeHtml(draft.startDate)}" required /></label>
       <label>End date<input name="endDate" type="date" min="${escapeHtml(draft.startDate)}" value="${escapeHtml(draft.endDate)}" required /></label>
      <div class="detail-actions"><button type="submit" class="primary-button">${draft.id ? 'Save sprint' : 'Add sprint'}</button><button type="button" id="clearSprintForm" class="secondary-button">Clear</button></div>
    </form>
    <div class="sprint-list">
       ${state.sprints.map((sprint) => `${renderSprintCalendar(sprint)}<div class="detail-actions sprint-actions"><button type="button" class="secondary-button" data-edit-sprint="${escapeHtml(sprint.id)}">Edit</button><button type="button" class="secondary-button" data-delete-sprint="${escapeHtml(sprint.id)}">Delete</button></div>`).join('') || '<p class="empty-state">No sprints</p>'}
    </div>
  `;

  document.getElementById('sprintForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (!values.name.trim() || !values.startDate || !values.endDate || values.endDate < values.startDate) return;
    const sprint = { id: draft.id || Date.now(), name: values.name.trim(), startDate: values.startDate, endDate: values.endDate, projectId: Number(values.projectId) };
    state.sprints = draft.id ? state.sprints.map((item) => item.id === draft.id ? sprint : item) : [...state.sprints, sprint];
    state.sprintDraft = null;
    saveSprintState();
    render();
  });
  document.getElementById('clearSprintForm').addEventListener('click', () => {
    state.sprintDraft = null;
    renderSchedule();
  });
  scheduleView.querySelectorAll('[data-edit-sprint]').forEach((button) => {
    button.addEventListener('click', () => {
      const sprint = state.sprints.find((item) => item.id === Number(button.dataset.editSprint));
      if (!sprint) return;
      state.sprintDraft = { ...sprint };
      renderSchedule();
    });
  });
  scheduleView.querySelectorAll('[data-delete-sprint]').forEach((button) => {
    button.addEventListener('click', () => {
      state.sprints = state.sprints.filter((sprint) => sprint.id !== Number(button.dataset.deleteSprint));
      saveSprintState();
      render();
    });
  });
}

function renderViews() {
  const isProjectRoute = ['projects', 'favorites', 'recent'].includes(state.route);
  projectView.classList.toggle('hidden', !isProjectRoute);
  ticketView.classList.toggle('hidden', state.route !== 'tickets');
  boardView.classList.toggle('hidden', state.route !== 'board');
  scheduleView.classList.toggle('hidden', state.route !== 'schedule');
}

function render() {
  renderSidebar();
  renderRecentList();
  renderViews();
  renderProjectList();
  renderTicketList();
  renderBoard();
  renderSchedule();
  renderDetailPanel();
  document.body.classList.toggle('theme-light', state.theme === 'light');
}

document.querySelectorAll('.nav-button').forEach((button) => {
  button.addEventListener('click', () => {
    state.route = button.dataset.route;
    state.ticketComposerOpen = false;
    state.ticketDraft = null;
    state.boardTicketId = null;
    const hash = state.route === 'projects' ? '' : `#${state.route}`;
    history.replaceState(null, '', `${window.location.pathname}${hash}`);
    render();
  });
});

window.addEventListener('hashchange', () => {
  const routes = { '#favorites': 'favorites', '#recent': 'recent', '#tickets': 'tickets', '#board': 'board', '#schedule': 'schedule' };
  state.route = routes[window.location.hash] || 'projects';
  state.ticketComposerOpen = false;
  state.ticketDraft = null;
  state.boardTicketId = null;
  render();
});

document.getElementById('themeToggle').addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.body.classList.toggle('theme-light', state.theme === 'light');
  document.body.classList.toggle('theme-dark', state.theme === 'dark');
});

loadData();
