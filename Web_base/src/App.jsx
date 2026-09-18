import React, { useEffect, useMemo, useState } from 'react';
import { ProjectDetailPanel } from './components/ProjectDetailPanel';
import { KanbanBoard } from './components/KanbanBoard';
import { ProjectListPanel } from './components/ProjectListPanel';
import { Sidebar } from './components/Sidebar';
import { SchedulePanel } from './components/SchedulePanel';
import { TicketListPanel } from './components/TicketListPanel';
import { defaultProjects, readProjects, readRecentIds, readSprints, readTickets, writeProjects, writeRecentIds, writeSprints, writeTickets } from './projectStorage';
import { ticketTypes } from './ticketTypes';

const ticketPrefixes = {
  Bug: 'BUG',
  Feature: 'FEAT',
  Task: 'TASK',
  Story: 'STORY',
  Epic: 'EPIC',
};

function createTicketId(ticketType, tickets) {
  const prefix = ticketPrefixes[ticketType] ?? 'TASK';
  const numbers = tickets
    .map((ticket) => ticket.ticketId?.match(new RegExp(`^${prefix}-(\\d+)$`))?.[1])
    .filter(Boolean)
    .map(Number);
  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
}

function getHashRoute(hash) {
  if (hash === '#favorites') return 'favorites';
  if (hash === '#recent') return 'recent';
  if (hash === '#board') return 'board';
  if (hash === '#schedule') return 'schedule';
  if (hash === '#tickets') return 'tickets';
  return 'all';
}

export function App() {
  const [projects, setProjects] = useState(() => readProjects());
  const [tickets, setTickets] = useState(() => readTickets());
  const [sprintDefinitions, setSprintDefinitions] = useState(() => readSprints());
  const [recentIds, setRecentIds] = useState(() => readRecentIds());
  const [selectedId, setSelectedId] = useState(defaultProjects[0].id);
  const [ticketProjectId, setTicketProjectId] = useState(defaultProjects[0].id);
  const [route, setRoute] = useState(() => getHashRoute(window.location.hash));
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [showForm, setShowForm] = useState(false);
  const [showSprintSettings, setShowSprintSettings] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [form, setForm] = useState({ ticketId: '', name: '', path: '', tags: '', sprint: '', startDate: '', endDate: '', ticketType: 'Task', parentId: '', projectId: '', assignee: '', gitBranch: '', repoStatus: 'clean' });
  const [detailForm, setDetailForm] = useState({ name: '', path: '', tags: '', gitBranch: '', repoStatus: 'clean' });

  useEffect(() => {
    writeProjects(projects);
  }, [projects]);

  useEffect(() => {
    writeTickets(tickets);
  }, [tickets]);

  useEffect(() => {
    writeSprints(sprintDefinitions);
  }, [sprintDefinitions]);

  useEffect(() => {
    writeRecentIds(recentIds);
  }, [recentIds]);

  useEffect(() => {
    const handleHashChange = () => setRoute(getHashRoute(window.location.hash));
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!projects.length) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !projects.some((project) => project.id === selectedId)) {
      setSelectedId(projects[0].id);
    }
  }, [projects, selectedId]);

  useEffect(() => {
    const selectedProject = projects.find((project) => project.id === selectedId);
    if (!selectedProject) {
      setDetailForm({ name: '', path: '', tags: '', gitBranch: '', repoStatus: 'clean' });
      return;
    }

    setDetailForm({
      name: selectedProject.name,
      path: selectedProject.path,
      tags: (selectedProject.tags ?? []).join(', '),
      gitBranch: selectedProject.gitBranch ?? '',
      repoStatus: selectedProject.repoStatus ?? 'clean',
    });
  }, [projects, selectedId]);

  const allTags = useMemo(
    () => Array.from(new Set(projects.flatMap((project) => project.tags))).sort(),
    [projects]
  );

  const recentProjects = recentIds
    .map((id) => projects.find((project) => project.id === id))
    .filter(Boolean);

  const filteredProjects = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return projects.filter((project) => {
      const inRoute =
        route === 'all'
          ? true
          : route === 'favorites'
            ? project.favorite
            : recentIds.includes(project.id);

      const haystack = `${project.name} ${project.path} ${project.tags.join(' ')}`.toLowerCase();
      const matchesSearch = !keyword || haystack.includes(keyword);
      const matchesTag = selectedTag === 'all' || project.tags.includes(selectedTag);
      const matchesFavorite = !favoriteOnly || project.favorite;

      return inRoute && matchesSearch && matchesTag && matchesFavorite;
    });
  }, [favoriteOnly, projects, recentIds, route, search, selectedTag]);

  const [sortMode, setSortMode] = useState('saved');

  const sortedProjects = useMemo(() => {
    const list = [...filteredProjects];
    const recentIndex = new Map(recentIds.map((id, index) => [id, index]));

    switch (sortMode) {
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'path':
        return list.sort((a, b) => a.path.localeCompare(b.path));
      case 'recent':
        return list.sort((a, b) => (recentIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (recentIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER));
      case 'saved':
      default:
        return list;
    }
  }, [filteredProjects, recentIds, sortMode]);

  const selectedProject = projects.find((project) => project.id === selectedId) ?? null;
  const invalidProjectCount = projects.filter((project) => !project.path || !project.path.trim()).length;

  useEffect(() => {
    if (!projects.length) {
      setTicketProjectId(null);
      return;
    }

    if (!ticketProjectId || !projects.some((project) => project.id === ticketProjectId)) {
      setTicketProjectId(selectedId ?? projects[0].id);
    }
  }, [projects, selectedId, ticketProjectId]);

  const getDescendantIds = (projectId) => {
    const descendants = new Set();
    const collect = (parentId) => {
      projects.filter((project) => project.parentId === parentId).forEach((project) => {
        if (!descendants.has(project.id)) {
          descendants.add(project.id);
          collect(project.id);
        }
      });
    };
    collect(projectId);
    return descendants;
  };

  const parentTickets = tickets.filter((ticket) => ticket.id !== editingProjectId);
  const ticketProjects = useMemo(
    () => ticketProjectId ? tickets.filter((ticket) => ticket.projectId === ticketProjectId) : tickets,
    [tickets, ticketProjectId]
  );

  const moveTicket = (ticketId, targetId, mode) => {
    setTickets((current) => {
      const source = current.find((ticket) => ticket.id === ticketId);
      const target = current.find((ticket) => ticket.id === targetId);
      if (!source || !target || source.id === target.id || source.projectId !== target.projectId) return current;

      const descendants = new Set();
      const collect = (parentId) => current.filter((ticket) => ticket.parentId === parentId).forEach((ticket) => {
        if (!descendants.has(ticket.id)) {
          descendants.add(ticket.id);
          collect(ticket.id);
        }
      });
      collect(source.id);
      if (mode === 'child' && descendants.has(target.id)) return current;

      const nextParentId = mode === 'child' ? target.id : (target.parentId ?? null);
      const siblings = current
        .filter((ticket) => ticket.projectId === source.projectId && (ticket.parentId ?? null) === nextParentId && ticket.id !== source.id)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const targetIndex = mode === 'child'
        ? siblings.length
        : Math.max(0, siblings.findIndex((ticket) => ticket.id === target.id));
      siblings.splice(targetIndex, 0, source);
      const orderById = new Map(siblings.map((ticket, index) => [ticket.id, index]));

      return current.map((ticket) => {
        if (ticket.id === source.id) return { ...ticket, parentId: nextParentId, order: orderById.get(ticket.id) };
        if (orderById.has(ticket.id)) return { ...ticket, order: orderById.get(ticket.id) };
        return ticket;
      });
    });
  };

  const updateSelectedId = (id, isFavoriteToggle = false) => {
    setSelectedId(id);
    if (!isFavoriteToggle) {
      setRecentIds((current) => [id, ...current.filter((item) => item !== id)].slice(0, 5));
    }
  };

  const navigate = (nextRoute) => {
    setRoute(nextRoute);
    const hash = nextRoute === 'all' ? '#/' : `#${nextRoute}`;
    window.location.hash = hash;
  };

  const handleOpenProject = () => {
    if (!selectedProject) return;

    try {
      const filePath = selectedProject.path.startsWith('http') ? selectedProject.path : `file://${selectedProject.path}`;
      window.open(filePath, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Unable to open project path', error);
    }
  };

  const closeTicketForm = () => {
    setShowForm(false);
    setEditingProjectId(null);
    setForm({ ticketId: '', name: '', path: '', tags: '', sprint: '', startDate: '', endDate: '', ticketType: 'Task', parentId: '', projectId: '', assignee: '', gitBranch: '', repoStatus: 'clean' });
  };

  const addProject = (event) => {
    event.preventDefault();
    const name = form.name.trim();
    const path = form.path.trim();
    if (!name || !path) return;

    const payload = {
      name,
      path,
      favorite: false,
      gitBranch: form.gitBranch.trim(),
      repoStatus: form.repoStatus || 'clean',
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    if (editingProjectId != null && route !== 'tickets') {
      setProjects((current) =>
        current.map((project) =>
          project.id === editingProjectId ? { ...project, ...payload } : project
        )
      );
      setSelectedId(editingProjectId);
      setTicketProjectId(editingProjectId);
    } else {
      const nextProject = {
        id: Date.now(),
        ...payload,
        favorite: false,
      };

      setProjects((current) => [nextProject, ...current]);
      setSelectedId(nextProject.id);
      setTicketProjectId(nextProject.id);
      setSelectedTag('all');

      if (route === 'tickets') {
        window.location.hash = '#tickets';
      } else {
        setRoute('all');
        window.location.hash = '#/';
      }
    }

    closeTicketForm();
  };

  const saveSelectedProject = (event) => {
    event.preventDefault();
    if (!selectedProject) return;

    setProjects((current) =>
      current.map((project) =>
        project.id === selectedProject.id
          ? {
              ...project,
              name: detailForm.name.trim() || project.name,
              path: detailForm.path.trim() || project.path,
              tags: detailForm.tags
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
              gitBranch: detailForm.gitBranch.trim(),
              repoStatus: detailForm.repoStatus || 'unknown',
            }
          : project
      )
    );
  };

  const toggleFavorite = (id) => {
    setProjects((current) =>
      current.map((project) =>
        project.id === id ? { ...project, favorite: !project.favorite } : project
      )
    );
  };

  const addComment = (event) => {
    event.preventDefault();
    const text = commentDraft.trim();
    if (!selectedProject || !text) return;

    const comment = {
      id: `${Date.now()}-${Math.random()}`,
      text,
      createdAt: new Date().toISOString(),
    };
    setProjects((current) => current.map((project) => (
      project.id === selectedProject.id
        ? { ...project, comments: [...(project.comments ?? []), comment] }
        : project
    )));
    setCommentDraft('');
  };

  const deleteProject = (id) => {
    setProjects((current) => {
      const next = current.filter((project) => project.id !== id);
      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? null);
      }
      return next;
    });
    setRecentIds((current) => current.filter((item) => item !== id));
    setTickets((current) => current.filter((ticket) => ticket.projectId !== id));
    setSprintDefinitions((current) => current.filter((sprint) => sprint.projectId !== id));

    if (ticketProjectId === id) {
      setTicketProjectId((current) => current && current !== id ? current : (projects.find((project) => project.id !== id)?.id ?? null));
    }
  };

  const openTicketAddModal = (project) => {
    const targetProject = project ?? selectedProject;
    setEditingProjectId(null);
    setForm({
      ticketId: '',
      name: '',
      path: '',
      tags: '',
      sprint: '',
      startDate: '',
      endDate: '',
      ticketType: 'Task',
      parentId: '',
      projectId: targetProject ? String(targetProject.id) : String(ticketProjectId ?? ''),
      assignee: '',
      gitBranch: '',
      repoStatus: 'clean',
    });
    setShowForm(true);
  };

  const openTicketEditModal = (project) => {
    setEditingProjectId(project.id);
    setForm({
      ticketId: project.ticketId ?? '',
      name: project.title ?? '',
      path: '',
      tags: '',
      sprint: project.sprint ?? '',
      startDate: project.startDate ?? '',
      endDate: project.endDate ?? '',
      ticketType: ticketTypes.includes(project.ticketType) ? project.ticketType : 'Task',
      parentId: project.parentId ? String(project.parentId) : '',
      projectId: String(project.projectId ?? ''),
      assignee: project.assignee ?? '',
      gitBranch: '',
      repoStatus: 'clean',
    });
    setShowForm(true);
  };

  const addTicket = (event) => {
    event.preventDefault();
    const title = form.name.trim();
    const projectId = Number(form.projectId);
    if (!title || !projectId) return;

    const payload = {
      ticketId: form.ticketId.trim() || createTicketId(form.ticketType, tickets),
      title,
      projectId,
      sprint: form.sprint.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      ticketType: ticketTypes.includes(form.ticketType) ? form.ticketType : 'Task',
      parentId: form.parentId ? Number(form.parentId) : null,
      order: tickets.filter((ticket) => ticket.projectId === projectId && (ticket.parentId ?? null) === (form.parentId ? Number(form.parentId) : null)).length,
      assignee: form.assignee.trim(),
      status: 'todo',
    };

    if (editingProjectId != null) {
      setTickets((current) => current.map((ticket) => ticket.id === editingProjectId ? { ...ticket, ...payload } : ticket));
    } else {
      setTickets((current) => [{ id: Date.now(), ...payload }, ...current]);
    }
    closeTicketForm();
  };

  const deleteTicket = (id) => {
    setTickets((current) => current
      .filter((ticket) => ticket.id !== id)
      .map((ticket) => ticket.parentId === id ? { ...ticket, parentId: null } : ticket));
  };

  const moveTicketStatus = (id, status) => {
    setTickets((current) => current.map((ticket) => ticket.id === id ? { ...ticket, status } : ticket));
  };

  const saveSprintDefinition = (sprint) => {
    setSprintDefinitions((current) => current.some((item) => item.id === sprint.id)
      ? current.map((item) => item.id === sprint.id ? sprint : item)
      : [...current, sprint]);
  };

  const deleteSprintDefinition = (id) => {
    setSprintDefinitions((current) => current.filter((sprint) => sprint.id !== id));
  };

  const handleBrowseFolder = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const displayPath = file.webkitRelativePath
      ? file.webkitRelativePath.split('/').filter(Boolean)[0] || file.name
      : file.name;

    setForm((current) => ({ ...current, path: displayPath }));
    event.target.value = '';
  };

  const handleExportProjects = () => {
    const payload = JSON.stringify({ projects, tickets, sprints: sprintDefinitions }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'projects.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImportProjects = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed) && !Array.isArray(parsed?.projects)) {
        throw new Error('Invalid project import file');
      }

      const importedProjects = Array.isArray(parsed) ? parsed : parsed.projects;
      const normalizedProjects = importedProjects.map((project) => ({
        id: Number(project.id) || Date.now() + Math.random(),
        name: project.name ?? 'Imported Project',
        path: project.path ?? '',
        favorite: Boolean(project.favorite),
        tags: Array.isArray(project.tags) ? project.tags : [],
        comments: Array.isArray(project.comments)
          ? project.comments.filter((comment) => comment && typeof comment.text === 'string')
          : [],
        gitBranch: project.gitBranch ?? '',
        repoStatus: project.repoStatus ?? 'unknown',
      }));

      setProjects((current) => {
        const merged = [...normalizedProjects, ...current];
        const unique = new Map();
        merged.forEach((project) => unique.set(project.id, project));
        return [...unique.values()];
      });

      if (!Array.isArray(parsed)) {
        const normalizedTickets = (parsed.tickets ?? []).map((ticket) => ({
          id: Number(ticket.id) || Date.now() + Math.random(),
          ticketId: ticket.ticketId ?? createTicketId(ticket.ticketType, parsed.tickets ?? []),
          title: ticket.title ?? 'Imported Ticket',
          projectId: Number(ticket.projectId) || null,
          sprint: ticket.sprint ?? '',
          startDate: ticket.startDate ?? '',
          endDate: ticket.endDate ?? '',
          ticketType: ticketTypes.includes(ticket.ticketType) ? ticket.ticketType : 'Task',
          parentId: Number(ticket.parentId) || null,
          assignee: ticket.assignee ?? '',
          status: ['todo', 'doing', 'done'].includes(ticket.status) ? ticket.status : 'todo',
        }));
        setTickets((current) => [...normalizedTickets, ...current]);
        const normalizedSprints = (parsed.sprints ?? []).map((sprint) => ({
          id: Number(sprint.id) || Date.now() + Math.random(),
          projectId: Number(sprint.projectId) || null,
          name: sprint.name ?? 'Imported Sprint',
          startDate: sprint.startDate ?? '',
          endDate: sprint.endDate ?? '',
        })).filter((sprint) => sprint.projectId != null);
        setSprintDefinitions((current) => [...normalizedSprints, ...current]);
      }
    } catch (error) {
      console.error('Unable to import projects', error);
      window.alert('プロジェクト JSON の読み込みに失敗しました。');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className={`app-shell ${theme}`}>
      <Sidebar
        route={route}
        onNavigate={navigate}
        recentProjects={recentProjects}
        onSelectProject={updateSelectedId}
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
      />

      <main className="workspace-layout">
        {route === 'tickets' ? (
          <TicketListPanel
            tickets={ticketProjects}
            projectOptions={projects}
            selectedProjectId={ticketProjectId}
            onSelectTicketProject={setTicketProjectId}
            showForm={showForm}
            onToggleForm={closeTicketForm}
            form={form}
            onFormChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))}
            parentTickets={parentTickets}
            ticketTypes={ticketTypes}
            onAddTicket={addTicket}
            onOpenCreate={openTicketAddModal}
            onEditTicket={openTicketEditModal}
            onDeleteTicket={deleteTicket}
            onMoveTicket={moveTicket}
          />
        ) : route === 'board' ? (
          <KanbanBoard
            tickets={tickets}
            projectOptions={projects}
            onSelectTicket={openTicketEditModal}
            onMoveTicketStatus={moveTicketStatus}
            showForm={showForm}
            onToggleForm={closeTicketForm}
            form={form}
            onFormChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))}
            parentTickets={parentTickets}
            ticketTypes={ticketTypes}
            onAddTicket={addTicket}
            showSprintSettings={showSprintSettings}
            onToggleSprintSettings={() => setShowSprintSettings((value) => !value)}
            sprintDefinitions={sprintDefinitions}
            onSaveSprint={saveSprintDefinition}
            onDeleteSprint={deleteSprintDefinition}
          />
        ) : route === 'schedule' ? (
          <SchedulePanel
            tickets={tickets}
            projects={projects}
            sprintDefinitions={sprintDefinitions}
            onSelectTicket={openTicketEditModal}
            showSprintSettings={showSprintSettings}
            onToggleSprintSettings={() => setShowSprintSettings((value) => !value)}
            onSaveSprint={saveSprintDefinition}
            onDeleteSprint={deleteSprintDefinition}
          />
        ) : <ProjectListPanel
          projects={sortedProjects}
          search={search}
          onSearch={setSearch}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          allTags={allTags}
          favoriteOnly={favoriteOnly}
          onToggleFavoriteOnly={setFavoriteOnly}
          showForm={showForm}
          onToggleForm={() => setShowForm((value) => !value)}
          form={form}
          onFormChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))}
          onAddProject={addProject}
          selectedId={selectedId}
          onSelectProject={updateSelectedId}
          onDeleteProject={deleteProject}
          onToggleFavorite={toggleFavorite}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
          onBrowseFolder={handleBrowseFolder}
          onImportProjects={handleImportProjects}
          onExportProjects={handleExportProjects}
          invalidProjectCount={invalidProjectCount}
        />}

        {route !== 'board' && route !== 'tickets' && route !== 'schedule' && <ProjectDetailPanel
          selectedProject={selectedProject}
          detailForm={detailForm}
          commentDraft={commentDraft}
          onCommentDraftChange={setCommentDraft}
          onAddComment={addComment}
          onFieldChange={(field, value) => setDetailForm((current) => ({ ...current, [field]: value }))}
          onSave={saveSelectedProject}
          onToggleFavorite={toggleFavorite}
          onOpenProject={handleOpenProject}
        />}
      </main>
    </div>
  );
}
