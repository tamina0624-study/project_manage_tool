import { useMemo, useState } from 'react';
import { SprintSettingsModal } from './SprintSettingsModal';

const dayMs = 24 * 60 * 60 * 1000;

function parseDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  return value.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getDays(startDate, endDate) {
  const days = [];
  for (let time = startDate.getTime(); time <= endDate.getTime(); time += dayMs) {
    days.push(new Date(time));
  }
  return days;
}

export function SchedulePanel({ tickets, projects, sprintDefinitions, onSelectTicket, showSprintSettings, onToggleSprintSettings, onSaveSprint, onDeleteSprint }) {
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedSprintId, setSelectedSprintId] = useState('all');
  const selectedSprints = sprintDefinitions.filter((sprint) => selectedProjectId === 'all' || sprint.projectId === Number(selectedProjectId));
  const selectedSprint = selectedSprintId === 'all'
    ? null
    : selectedSprints.find((sprint) => String(sprint.id) === selectedSprintId) ?? null;
  const visibleTickets = tickets.filter((ticket) => selectedProjectId === 'all' || ticket.projectId === Number(selectedProjectId));
  const sprintGroups = useMemo(() => selectedSprints.map((sprint) => ({
    sprint,
    tickets: visibleTickets.filter((ticket) => ticket.sprint === sprint.name),
  })), [selectedSprints, visibleTickets]);

  const renderTimeline = (sprint, sprintTickets) => {
    const startDate = parseDate(sprint.startDate);
    const endDate = parseDate(sprint.endDate);
    if (!startDate || !endDate || endDate < startDate) return <div className="schedule-empty">Set valid sprint dates to show the timeline.</div>;
    const days = getDays(startDate, endDate);
    const project = projects.find((candidate) => candidate.id === sprint.projectId);
    return (
      <section className="schedule-card" key={sprint.id}>
        <header className="schedule-card-header">
          <div><p>{project?.name ?? 'Unknown project'}</p><h3>{sprint.name}</h3></div>
          <span>{formatDate(startDate)} - {formatDate(endDate)}</span>
        </header>
        <div className="schedule-grid" style={{ '--schedule-days': days.length }}>
          <div className="schedule-label schedule-period-label">Date</div>
          {days.map((day) => <div className="schedule-day" key={day.toISOString()}>{day.getDate()}</div>)}
          {sprintTickets.length > 0 ? sprintTickets.map((ticket, index) => {
            const ticketStart = parseDate(ticket.startDate) ?? new Date(startDate.getTime() + (index % days.length) * dayMs);
            const ticketEnd = parseDate(ticket.endDate) ?? ticketStart;
            const startOffset = Math.max(0, Math.round((ticketStart.getTime() - startDate.getTime()) / dayMs));
            const endOffset = Math.min(days.length - 1, Math.round((ticketEnd.getTime() - startDate.getTime()) / dayMs));
            const columnStart = Math.min(days.length, startOffset + 2);
            const columnEnd = Math.max(columnStart + 1, Math.min(days.length + 2, endOffset + 3));
            return (
              <div className="schedule-row" key={ticket.id}>
                <div className="schedule-label" onDoubleClick={() => onSelectTicket?.(ticket)}><strong>{ticket.ticketId ?? 'No ID'}</strong><span>{ticket.title}</span></div>
                <div className="schedule-track">
                  <button type="button" className={`schedule-bar schedule-bar-${ticket.ticketType?.toLowerCase() ?? 'task'}`} style={{ gridColumn: `${columnStart} / ${columnEnd}` }} onDoubleClick={() => onSelectTicket?.(ticket)}>{ticket.title}</button>
                </div>
              </div>
            );
          }) : <div className="schedule-empty">No tickets assigned to this sprint.</div>}
        </div>
      </section>
    );
  };

  return (
    <section className="schedule-panel">
      <header className="topbar schedule-topbar">
        <div><h2>Schedule calendar</h2><p className="panel-subtitle">Plan sprint work across its calendar dates.</p></div>
        <div className="schedule-controls">
          <label>Project<select value={selectedProjectId} onChange={(event) => { setSelectedProjectId(event.target.value); setSelectedSprintId('all'); }}><option value="all">All projects</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <label>Sprint<select value={selectedSprintId} onChange={(event) => setSelectedSprintId(event.target.value)}><option value="all">All sprints</option>{selectedSprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}</select></label>
          <button type="button" className="secondary-button" onClick={onToggleSprintSettings}>Sprint settings</button>
        </div>
      </header>
      {selectedSprint ? renderTimeline(selectedSprint, visibleTickets.filter((ticket) => ticket.sprint === selectedSprint.name)) : (
        <div className="schedule-list">{sprintGroups.length > 0 ? sprintGroups.map(({ sprint, tickets: sprintTickets }) => renderTimeline(sprint, sprintTickets)) : <div className="empty-state">No sprint definitions yet. Add one from Sprint settings.</div>}</div>
      )}
      {showSprintSettings && <SprintSettingsModal sprints={sprintDefinitions} projects={projects} onClose={onToggleSprintSettings} onSave={onSaveSprint} onDelete={onDeleteSprint} />}
    </section>
  );
}
