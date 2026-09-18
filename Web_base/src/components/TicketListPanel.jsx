import { useState } from 'react';
import { backlogMeta, ticketTypeMeta } from '../ticketTypes';
import { TicketFormModal } from './TicketFormModal';

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
  const [dropTargetMode, setDropTargetMode] = useState(null);
  const [copiedTicketId, setCopiedTicketId] = useState(null);
  const toggleMenu = (id) => setMenuOpenId((current) => current === id ? null : id);

  const copyTicketText = async (event, ticket) => {
    event.stopPropagation();
    const text = `${ticket.ticketId ?? 'No ID'} · ${ticket.title}`;
    await navigator.clipboard.writeText(text);
    setCopiedTicketId(ticket.id);
    window.setTimeout(() => setCopiedTicketId((current) => current === ticket.id ? null : current), 1500);
  };

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
    setDropTargetMode(null);
  };
  const handleSameLevelDrop = (event, targetId) => handleDrop(event, targetId, 'before');

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
                  className={`ticket-tree-row ${dropTargetId === ticket.id ? `ticket-drop-target ticket-drop-target-${dropTargetMode}` : ''}`}
                  draggable
                  onDoubleClick={(event) => {
                    if (event.target.closest('button, select, input, a')) return;
                    onEditTicket?.(ticket);
                  }}
                  onDragStart={(event) => {
                    setDraggedTicketId(ticket.id);
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/ticket-id', String(ticket.id));
                  }}
                  onDragEnd={() => { setDraggedTicketId(null); setDropTargetId(null); setDropTargetMode(null); }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setDropTargetId(ticket.id);
                    setDropTargetMode('reorder');
                  }}
                  onDrop={(event) => handleDrop(event, ticket.id, 'before')}
                >
                  <td
                    className="ticket-reorder-drop-zone"
                    data-drop-active={dropTargetId === ticket.id && dropTargetMode === 'reorder' ? 'true' : undefined}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleSameLevelDrop(event, ticket.id)}
                  >
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
                  <td
                    className="ticket-reorder-drop-zone"
                    data-drop-active={dropTargetId === ticket.id && dropTargetMode === 'reorder' ? 'true' : undefined}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleSameLevelDrop(event, ticket.id)}
                  >{renderTicketType(ticket.ticketType)}</td>
                  <td
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setDropTargetId(ticket.id);
                      setDropTargetMode('child');
                    }}
                    onDrop={(event) => handleDrop(event, ticket.id, 'child')}
                    className={dropTargetId === ticket.id && dropTargetMode === 'child' ? 'ticket-child-drop-zone' : ''}
                    title="Drop here to make this ticket a child"
                  >
                    <div className="ticket-title-cell" style={{ marginLeft: `${depth * 1.2}rem` }}>
                      <span className="ticket-tree-visual" aria-hidden="true">{depth > 0 ? '├─' : '◉'}</span>
                      <strong>{ticket.ticketId ?? 'No ID'} · {ticket.title}</strong>
                      <button type="button" className="copy-text-button" aria-label={`Copy ${ticket.title}`} onClick={(event) => copyTicketText(event, ticket)}>{copiedTicketId === ticket.id ? 'Copied' : 'Copy'}</button>
                    </div>
                  </td>
                  <td
                    className="ticket-reorder-drop-zone"
                    data-drop-active={dropTargetId === ticket.id && dropTargetMode === 'reorder' ? 'true' : undefined}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleSameLevelDrop(event, ticket.id)}
                  ><span className="ticket-status">{statusLabels[ticket.status ?? 'todo'] ?? 'Todo'}</span></td>
                  <td
                    className="ticket-reorder-drop-zone"
                    data-drop-active={dropTargetId === ticket.id && dropTargetMode === 'reorder' ? 'true' : undefined}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleSameLevelDrop(event, ticket.id)}
                  >{renderBacklog(ticket.sprint)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty-state">No tickets match your current filter.</div>}
      </div>

      {showForm && <TicketFormModal form={form} onToggleForm={onToggleForm} onFormChange={onFormChange} projectOptions={projectOptions} parentTickets={parentTickets} ticketTypes={ticketTypes} onAddTicket={onAddTicket} />}
    </section>
  );
}
