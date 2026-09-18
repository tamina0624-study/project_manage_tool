export const STORAGE_KEY = 'web-project-manager-projects';
export const TICKETS_STORAGE_KEY = 'web-project-manager-tickets';
export const RECENT_KEY = 'web-project-manager-recent';

export const defaultProjects = [
  { id: 1, name: 'My App', path: '/workspace/my-app', favorite: true, tags: ['app', 'react'], gitBranch: 'main', repoStatus: 'clean', comments: [] },
  { id: 2, name: 'API Service', path: '/workspace/api-service', favorite: true, tags: ['backend'], gitBranch: 'develop', repoStatus: 'dirty', comments: [] },
];

export const defaultTickets = [
  { id: 101, ticketId: 'EPIC-001', title: 'Application foundation', projectId: 1, sprint: 'Sprint 1', ticketType: 'Epic', parentId: null, order: 0, assignee: 'Alice', status: 'doing' },
  { id: 102, ticketId: 'TASK-001', title: 'Documentation', projectId: 1, sprint: 'Sprint 1', ticketType: 'Task', parentId: 101, order: 0, assignee: 'Bob', status: 'todo' },
  { id: 103, ticketId: 'FEAT-001', title: 'API endpoints', projectId: 2, sprint: '', ticketType: 'Feature', parentId: null, order: 0, assignee: '', status: 'done' },
];

function migrateLegacyProjects(legacyProjects) {
  const roots = legacyProjects.filter((project) => project.parentId == null);
  const projects = (roots.length > 0 ? roots : legacyProjects.slice(0, 1)).map((project) => ({
    id: project.id,
    name: project.name,
    path: project.path ?? '',
    favorite: Boolean(project.favorite),
    tags: Array.isArray(project.tags) ? project.tags : [],
    gitBranch: project.gitBranch ?? '',
    repoStatus: project.repoStatus ?? 'unknown',
    comments: Array.isArray(project.comments) ? project.comments : [],
  }));
  const rootIds = new Set(projects.map((project) => project.id));

  const findProjectId = (project) => {
    let current = project;
    const visited = new Set();
    while (current?.parentId != null && !visited.has(current.id)) {
      visited.add(current.id);
      current = legacyProjects.find((candidate) => candidate.id === current.parentId);
    }
    return rootIds.has(current?.id) ? current.id : projects[0]?.id ?? null;
  };

  const tickets = legacyProjects.map((project, index) => ({
    id: project.id,
    ticketId: project.ticketId ?? `TASK-${String(project.id).padStart(3, '0')}`,
    title: project.name,
    projectId: findProjectId(project),
    sprint: project.sprint ?? '',
    ticketType: project.ticketType ?? 'Task',
    parentId: project.parentId ?? null,
    order: index,
    assignee: project.assignee ?? '',
    status: project.status ?? 'todo',
  }));

  return { projects, tickets };
}

export function readProjects() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProjects));
    localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(defaultTickets));
    return defaultProjects;
  }

  const parsed = JSON.parse(saved);
  if (parsed?.projects && Array.isArray(parsed.projects)) return parsed.projects;
  if (!Array.isArray(parsed)) return defaultProjects;

  const migrated = migrateLegacyProjects(parsed);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated.projects));
  if (!localStorage.getItem(TICKETS_STORAGE_KEY)) {
    localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(migrated.tickets));
  }
  return migrated.projects;
}

export function readTickets() {
  const saved = localStorage.getItem(TICKETS_STORAGE_KEY);
  return saved ? JSON.parse(saved) : defaultTickets;
}

export function writeProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function writeTickets(tickets) {
  localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
}

export function readRecentIds() {
  const saved = localStorage.getItem(RECENT_KEY);
  return saved ? JSON.parse(saved) : [];
}

export function writeRecentIds(recentIds) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(recentIds));
}
