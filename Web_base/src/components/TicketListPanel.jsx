import { useState } from 'react';
import { backlogMeta, ticketTypeMeta } from '../ticketTypes';

const statusLabels = {
  todo: 'Todo',
  doing: 'In progress',
  done: 'Done',
};

export function TicketListPanel({
  tickets,
  projectOptions,
  selectedProjectId,
  onSelectTicketProject,
  showForm,
  onToggleForm,
  form,
  onFormChange,
  parentTickets,
  ticketTypes,
  onAddTicket,
  onOpenCreate,
  onEditTicket,
  onDeleteTicket,
  onMoveTicket,
}) {
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [draggedTicketId, setDraggedTicketId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const toggleMenu = (id) => setMenuOpenId((current) => current === id ? null : id);

  const buildTreeRows = (list) => {
    const byParent = new Map();
    list.forEach((ticket) => {
      const parentId = ticket.parentId ?? null;
      byParent.set(parentId, [...(byParent.get(parentId) ?? []), ticket]);
    });
    const order = [];
    const walk = (ticket, depth, visited) => {
      if (visited.has(ticket.id)) return;
      const nextVisited = new Set(visited).add(ticket.id);
      order.push({ ticket, depth });
      (byParent.get(ticket.id) ?? [])
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title))
        .forEach((child) => walk(child, depth + 1, nextVisited));
    };
    (byParent.get(null) ?? []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title)).forEach((ticket) => walk(ticket, 0, new Set()));
    list.filter((ticket) => !order.some((row) => row.ticket.id === ticket.id)).forEach((ticket) => walk(ticket, 0, new Set()));
    return order;
  };

  const treeRows = buildTreeRows(tickets);
  const ticketById = new Map(tickets.map((ticket) => [ticket.id, ticket]));
  const renderTicketType = (ticketType) => {
    const meta = ticketTypeMeta[ticketType] ?? ticketTypeMeta.Task;
    return <span className={`ticket-type ${meta.className}`}><span className="ticket-type-icon" aria-hidden="true">{meta.icon}</span>{ticketType ?? 'Task'}</span>;
  };
  const renderBacklog = (sprint) => {
    const isBacklog = !sprint;
    return <span className={`sprint-chip ${isBacklog ? backlogMeta.className : ''}`}><span className="ticket-type-icon" aria-hidden="true">{isBacklog ? backlogMeta.icon : '◆'}</span>{sprint || 'Product Backlog'}</span>;
  };
  const handleDrop = (event, targetId, mode) => {
    event.preventDefault();
    event.stopPropagation();
    if (draggedTicketId != null) onMoveTicket?.(draggedTicketId, targetId, mode);
    setDraggedTicketId(null);
    setDropTargetId(null);
  };

  return (
    <section className="ticket-panel">
      <header className="topbar">
        <div>
          <h2>Tickets</h2>
          <p className="panel-subtitle">Browse tickets belonging to a selected project.</p>
        </div>
        <div className="ticket-toolbar">
          <label className="ticket-project-filter">
            Project
            <select value={selectedProjectId ?? ''} onChange={(event) => onSelectTicketProject(event.target.value ? Number(event.target.value) : null)}>
              <option value="">All projects</option>
              {projectOptions.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          <span className="ticket-count">{tickets.length} tickets</span>
        </div>
      </header>

      <div className="page-help">
        <strong>How to use:</strong> select a project to filter its tickets. Drag a row to reorder it, or drop it on the title to make it a child ticket.
      </div>

      <div className="ticket-table-wrap">
        {tickets.length > 0 ? (
          <table className="ticket-table" role="table">
            <thead>
              <tr>
                <th>Parent ticket</th>
                <th className="ticket-header-actions">
                  <div className="ticket-header-control">
                    <button type="button" className="ticket-menu-trigger ticket-menu-trigger-left" aria-label="Open ticket actions" onClick={() => toggleMenu('header')}>☰</button>
                    {menuOpenId === 'header' && (
                      <div className="ticket-menu ticket-menu-header" onClick={(event) => event.stopPropagation()}>
                        <button type="button" onClick={() => { onOpenCreate?.(null); setMenuOpenId(null); }}>Add ticket</button>
                      </div>
                    )}
                  </div>
                </th>
                <th>Type</th>
                <th>Title</th>
                <th>Status</th>
                <th>Sprint</th>
              </tr>
            </thead>
            <tbody>
              {treeRows.map(({ ticket, depth }) => (
                <tr
                  key={ticket.id}
                  className={`ticket-tree-row ${dropTargetId === ticket.id ? 'ticket-drop-target' : ''}`}
                  draggable
                  onDragStart={(event) => {
                    setDraggedTicketId(ticket.id);
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/ticket-id', String(ticket.id));
                  }}
                  onDragEnd={() => { setDraggedTicketId(null); setDropTargetId(null); }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setDropTargetId(ticket.id);
                  }}
                  onDrop={(event) => handleDrop(event, ticket.id, 'before')}
                >
                  <td>
                    {ticket.parentId && ticketById.has(ticket.parentId) ? (
                      <span className="parent-ticket-label">
                        {ticketById.get(ticket.parentId).ticketId ?? 'No ID'} · {ticketById.get(ticket.parentId).title}
                      </span>
                    ) : (
                      <span className="parent-ticket-empty">No parent</span>
                    )}
                  </td>
                  <td>
                    <div className="ticket-table-actions">
                      <div className="ticket-menu-wrap">
                        <button type="button" className="ticket-menu-trigger" aria-label={`Open actions for ${ticket.title}`} onClick={() => toggleMenu(ticket.id)}>☰</button>
                        {menuOpenId === ticket.id && (
                          <div className="ticket-menu ticket-menu-row" onClick={(event) => event.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                const project = projectOptions.find((candidate) => candidate.id === ticket.projectId);
                                onOpenCreate?.(project ?? null);
                                setMenuOpenId(null);
                              }}
                            >
                              Add ticket
                            </button>
                            <button type="button" onClick={() => { onEditTicket?.(ticket); setMenuOpenId(null); }}>Edit ticket</button>
                            <button type="button" className="ticket-menu-danger" onClick={() => { onDeleteTicket?.(ticket.id); setMenuOpenId(null); }}>Delete ticket</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{renderTicketType(ticket.ticketType)}</td>
                  <td
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setDropTargetId(ticket.id);
                    }}
                    onDrop={(event) => handleDrop(event, ticket.id, 'child')}
                  >
                    <div className="ticket-title-cell" style={{ marginLeft: `${depth * 1.2}rem` }}>
                      <span className="ticket-tree-visual" aria-hidden="true">{depth > 0 ? '├─' : '◉'}</span>
                      <strong>{ticket.ticketId ?? 'No ID'} · {ticket.title}</strong>
                    </div>
                  </td>
                  <td><span className="ticket-status">{statusLabels[ticket.status ?? 'todo'] ?? 'Todo'}</span></td>
                  <td>{renderBacklog(ticket.sprint)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty-state">No tickets match your current filter.</div>}
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={onToggleForm}>
          <aside className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div><p className="modal-kicker">Ticket</p><h3>{form.ticketId || form.name ? 'Edit Ticket' : 'New Ticket'}</h3></div>
              <button type="button" className="ghost-button" onClick={onToggleForm}>Close</button>
            </div>
            <form className="project-form modal-form" onSubmit={onAddTicket}>
              <label>Project<select value={form.projectId} onChange={(event) => onFormChange('projectId', event.target.value)}><option value="">Select a project</option>{projectOptions.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
              <label>Ticket ID<input type="text" value={form.ticketId} onChange={(event) => onFormChange('ticketId', event.target.value)} placeholder="Auto-generated (e.g. TASK-001)" /></label>
              <label>Ticket title<input type="text" value={form.name} onChange={(event) => onFormChange('name', event.target.value)} placeholder="My ticket" /></label>
              <label>Sprint<input type="text" value={form.sprint} onChange={(event) => onFormChange('sprint', event.target.value)} placeholder="Sprint 1" /></label>
              <label>Ticket type<select value={form.ticketType} onChange={(event) => onFormChange('ticketType', event.target.value)}>{ticketTypes.map((ticketType) => <option key={ticketType} value={ticketType}>{ticketType}</option>)}</select></label>
              <label>Parent ticket<select value={form.parentId} onChange={(event) => onFormChange('parentId', event.target.value)}><option value="">No parent</option>{parentTickets.filter((ticket) => ticket.projectId === Number(form.projectId)).map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.ticketId ?? 'No ID'} - {ticket.title}</option>)}</select></label>
              <label>Assignee<input type="text" value={form.assignee} onChange={(event) => onFormChange('assignee', event.target.value)} placeholder="Assignee" /></label>
              <div className="modal-actions"><button type="button" className="secondary-button" onClick={onToggleForm}>Cancel</button><button type="submit" className="primary-button">{form.ticketId || form.name ? 'Save Ticket' : 'Create Ticket'}</button></div>
            </form>
          </aside>
        </div>
      )}
    </section>
  );
}
