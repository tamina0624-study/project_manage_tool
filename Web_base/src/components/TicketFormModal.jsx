export function TicketFormModal({
  form,
  onToggleForm,
  onFormChange,
  projectOptions,
  parentTickets,
  ticketTypes,
  onAddTicket,
}) {
  if (!form) return null;

  return (
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
          <label>Start date<input type="date" value={form.startDate ?? ''} onChange={(event) => onFormChange('startDate', event.target.value)} /></label>
          <label>End date<input type="date" value={form.endDate ?? ''} min={form.startDate || undefined} onChange={(event) => onFormChange('endDate', event.target.value)} /></label>
          <label>Ticket type<select value={form.ticketType} onChange={(event) => onFormChange('ticketType', event.target.value)}>{ticketTypes.map((ticketType) => <option key={ticketType} value={ticketType}>{ticketType}</option>)}</select></label>
          <label>Parent ticket<select value={form.parentId} onChange={(event) => onFormChange('parentId', event.target.value)}><option value="">No parent</option>{parentTickets.filter((ticket) => ticket.projectId === Number(form.projectId)).map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.ticketId ?? 'No ID'} - {ticket.title}</option>)}</select></label>
          <label>Assignee<input type="text" value={form.assignee} onChange={(event) => onFormChange('assignee', event.target.value)} placeholder="Assignee" /></label>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={onToggleForm}>Cancel</button><button type="submit" className="primary-button">{form.ticketId || form.name ? 'Save Ticket' : 'Create Ticket'}</button></div>
        </form>
      </aside>
    </div>
  );
}
