import { useEffect, useState } from 'react';

const emptyForm = {
  id: null,
  projectId: '',
  name: '',
  startDate: '',
  endDate: '',
};

function formatDate(date) {
  return date || 'Not set';
}

export function SprintSettingsModal({ sprints, projects, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setForm({ ...emptyForm, projectId: projects[0]?.id ? String(projects[0].id) : '' });
  }, [projects]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const editSprint = (sprint) => {
    setForm({
      id: sprint.id,
      projectId: String(sprint.projectId),
      name: sprint.name,
      startDate: sprint.startDate ?? '',
      endDate: sprint.endDate ?? '',
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.projectId || !form.name.trim() || !form.startDate || !form.endDate || form.endDate < form.startDate) return;
    onSave({
      id: form.id ?? Date.now(),
      projectId: Number(form.projectId),
      name: form.name.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
    });
    setForm({ ...emptyForm, projectId: form.projectId });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <aside className="modal-panel sprint-settings-panel" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div><p className="modal-kicker">Planning</p><h3>Sprint settings</h3></div>
          <button type="button" className="ghost-button" onClick={onClose}>Close</button>
        </div>
        <form className="project-form modal-form" onSubmit={handleSubmit}>
          <label>Project<select value={form.projectId} onChange={(event) => updateField('projectId', event.target.value)} required><option value="">Select a project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <label>Sprint name<input type="text" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Sprint 1" required /></label>
          <label>Start date<input type="date" value={form.startDate} onChange={(event) => updateField('startDate', event.target.value)} required /></label>
          <label>End date<input type="date" value={form.endDate} min={form.startDate || undefined} onChange={(event) => updateField('endDate', event.target.value)} required /></label>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setForm({ ...emptyForm, projectId: form.projectId })}>Clear</button><button type="submit" className="primary-button">{form.id ? 'Save Sprint' : 'Add Sprint'}</button></div>
        </form>
        <section className="sprint-definition-list">
          <h4>Defined sprints</h4>
          {sprints.length > 0 ? sprints.map((sprint) => {
            const project = projects.find((candidate) => candidate.id === sprint.projectId);
            return (
              <article className="sprint-definition-item" key={sprint.id}>
                <div><strong>{sprint.name}</strong><span>{project?.name ?? 'Unknown project'}</span><small>{formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}</small></div>
                <div className="sprint-definition-actions"><button type="button" className="ghost-button" onClick={() => editSprint(sprint)}>Edit</button><button type="button" className="ghost-button" onClick={() => onDelete(sprint.id)}>Delete</button></div>
              </article>
            );
          }) : <p className="comments-empty">No sprints defined yet.</p>}
        </section>
      </aside>
    </div>
  );
}
