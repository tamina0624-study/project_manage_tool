import { useMemo, useState } from 'react';
import { backlogMeta, ticketTypeMeta } from '../ticketTypes';

const columns = [
  { id: 'todo', title: 'Todo' },
  { id: 'doing', title: 'In progress' },
  { id: 'done', title: 'Done' },
];

export function KanbanBoard({ tickets, projectOptions, onSelectTicket, onMoveTicketStatus }) {
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedSprint, setSelectedSprint] = useState('all');
  const selectedTickets = selectedProjectId === 'all'
    ? (tickets ?? [])
    : (tickets ?? []).filter((ticket) => Number(ticket.projectId) === Number(selectedProjectId));
  const sprints = useMemo(
    () => Array.from(new Set(selectedTickets.map((ticket) => ticket.sprint).filter(Boolean))).sort(),
    [selectedTickets]
  );
  const visibleTickets = selectedTickets.filter((ticket) => {
    const sprint = typeof ticket.sprint === 'string' ? ticket.sprint.trim() : '';
    if (selectedSprint === 'all') return true;
    if (selectedSprint === 'backlog') return sprint === '';
    return sprint === selectedSprint;
  });

  const renderTicketType = (ticketType) => {
    const meta = ticketTypeMeta[ticketType] ?? ticketTypeMeta.Task;
    return <span className={`ticket-type ${meta.className}`}><span className="ticket-type-icon" aria-hidden="true">{meta.icon}</span>{ticketType ?? 'Task'}</span>;
  };

  const handleDrop = (event, status) => {
    event.preventDefault();
    const ticketId = Number(event.dataTransfer.getData('text/ticket-id'));
    if (ticketId) onMoveTicketStatus(ticketId, status);
  };

  const renderCard = (ticket, className = 'kanban-card') => (
    <article
      className={className}
      draggable
      onClick={() => onSelectTicket?.(ticket)}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/ticket-id', String(ticket.id));
      }}
    >
      <div className="kanban-card-title">
        <h4>{ticket.ticketId ?? 'No ID'} · {ticket.title}</h4>
        {renderTicketType(ticket.ticketType)}
      </div>
      <div className="kanban-card-meta">
        <span className={`sprint-chip ${ticket.sprint ? '' : backlogMeta.className}`}><span className="ticket-type-icon" aria-hidden="true">{ticket.sprint ? '◆' : backlogMeta.icon}</span>{ticket.sprint || 'Product Backlog'}</span>
        <span className="ticket-assignee">{ticket.assignee || 'Unassigned'}</span>
      </div>
    </article>
  );

  const parentTicketIds = new Set(
    visibleTickets
      .filter((ticket) => ticket.ticketType === 'Task')
      .map((ticket) => ticket.parentId == null || ticket.parentId === '' ? null : Number(ticket.parentId))
      .filter((parentId) => parentId != null)
  );
  const parentRows = visibleTickets
    .filter((ticket) => parentTicketIds.has(Number(ticket.id)))
    .map((parent) => ({
      parent,
      children: visibleTickets.filter((ticket) => {
        const parentId = ticket.parentId == null || ticket.parentId === '' ? null : Number(ticket.parentId);
        return parentId === Number(parent.id);
      }),
    }));

  return (
    <section className="kanban-panel">
      <header className="topbar">
        <div>
          <h2>Project board</h2>
          <p className="panel-subtitle">Track tickets for the selected project.</p>
        </div>
        <div className="board-filters">
          <label className="sprint-filter">
            Project
            <select value={selectedProjectId} onChange={(event) => { setSelectedProjectId(event.target.value); setSelectedSprint('all'); }}>
              <option value="all">All projects</option>
              {projectOptions.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          <label className="sprint-filter">
            Sprint
            <select value={selectedSprint} onChange={(event) => setSelectedSprint(event.target.value)}>
              <option value="all">All sprints (including Product Backlog)</option>
              <option value="backlog">Product Backlog</option>
              {sprints.map((sprint) => <option key={sprint} value={sprint}>{sprint}</option>)}
            </select>
          </label>
        </div>
      </header>

      <div className="page-help">
        <strong>How to use:</strong> select a project above to show its tickets, then drag tickets between columns to update status.
      </div>

      <div className="kanban-board">
        <header className="kanban-column-header kanban-parent-header">
          <h3>Parent</h3>
          <span>{parentRows.length}</span>
        </header>
        {columns.map((column) => {
          const columnTickets = visibleTickets.filter((ticket) => (
            (ticket.status ?? 'todo') === column.id
            && ticket.ticketType === 'Task'
          ));
          return (
            <header className="kanban-column-header" key={column.id}>
              <h3>{column.title}</h3>
              <span>{columnTickets.length}</span>
            </header>
          );
        })}
        {parentRows.map(({ parent, children }) => (
          <div className="kanban-grid-row" key={`row-${parent.id}`}>
            <div className="kanban-parent-cell">
              {renderCard(parent, 'kanban-card kanban-parent-card')}
            </div>
            {columns.map((column) => {
              const columnChildren = children.filter((ticket) => (ticket.status ?? 'todo') === column.id && ticket.ticketType === 'Task');
              return (
                <div
                  className="kanban-status-cell"
                  key={`${parent.id}-${column.id}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, column.id)}
                >
                  {columnChildren.length > 0
                    ? columnChildren.map((child) => renderCard(child))
                    : <span className="kanban-no-children">Drop tickets here</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
