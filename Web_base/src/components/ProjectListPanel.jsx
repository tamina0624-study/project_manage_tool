export function ProjectListPanel({
  projects,
  search,
  onSearch,
  selectedTag,
  onSelectTag,
  allTags,
  favoriteOnly,
  onToggleFavoriteOnly,
  showForm,
  onToggleForm,
  form,
  onFormChange,
  onAddProject,
  selectedId,
  onSelectProject,
  onDeleteProject,
  onToggleFavorite,
  sortMode,
  onSortModeChange,
  onBrowseFolder,
  onImportProjects,
  onExportProjects,
  invalidProjectCount,
}) {
  return (
    <section className="list-panel">
      <header className="topbar">
        <h2>Projects</h2>
        <button className="primary-button" onClick={onToggleForm}>
          {showForm ? 'Close' : 'Add Project'}
        </button>
      </header>

      <div className="page-help">
        <strong>How to use:</strong> search projects, narrow by tag, favorite important items, or add a project from the top-right button.
      </div>

      <div className="toolbar">
        <input
          type="text"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search projects"
          className="search-input"
        />
        <select
          className="sort-select"
          value={sortMode}
          onChange={(event) => onSortModeChange(event.target.value)}
        >
          <option value="saved">Saved</option>
          <option value="name">Name</option>
          <option value="path">Path</option>
          <option value="recent">Recent</option>
        </select>
      </div>

      <div className="action-row">
        <button type="button" className="secondary-button" onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = false;
          input.setAttribute('webkitdirectory', 'true');
          input.onchange = onBrowseFolder;
          input.click();
        }}>
          Browse folder
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = onImportProjects;
            input.click();
          }}
        >
          Import JSON
        </button>
        <button type="button" className="secondary-button" onClick={onExportProjects}>
          Export JSON
        </button>
      </div>

      {invalidProjectCount > 0 && (
        <div className="alert-banner">
          {invalidProjectCount} 件のプロジェクトにパスが未設定です。
        </div>
      )}

      <div className="filter-row">
        <button
          type="button"
          className={`filter-pill ${!favoriteOnly ? 'active' : ''}`}
          onClick={() => onToggleFavoriteOnly(false)}
        >
          All
        </button>
        <button
          type="button"
          className={`filter-pill ${favoriteOnly ? 'active' : ''}`}
          onClick={() => onToggleFavoriteOnly(true)}
        >
          Favorites
        </button>
      </div>

      <div className="tag-filters">
        <button
          type="button"
          className={`tag-filter ${selectedTag === 'all' ? 'active' : ''}`}
          onClick={() => onSelectTag('all')}
        >
          All
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            type="button"
            className={`tag-filter ${selectedTag === tag ? 'active' : ''}`}
            onClick={() => onSelectTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={onToggleForm}>
          <aside className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Project</p>
                <h3>New Project</h3>
              </div>
              <button type="button" className="ghost-button" onClick={onToggleForm}>
                Close
              </button>
            </div>

            <form className="project-form modal-form" onSubmit={onAddProject}>
              <label>
                Name
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => onFormChange('name', event.target.value)}
                  placeholder="My Project"
                />
              </label>

              <label>
                Path
                <input
                  type="text"
                  value={form.path}
                  onChange={(event) => onFormChange('path', event.target.value)}
                  placeholder="/workspace/my-project"
                />
              </label>

              <label>
                Tags
                <input
                  type="text"
                  value={form.tags}
                  onChange={(event) => onFormChange('tags', event.target.value)}
                  placeholder="web, ui, backend"
                />
              </label>

              <label>
                Git Branch
                <input
                  type="text"
                  value={form.gitBranch}
                  onChange={(event) => onFormChange('gitBranch', event.target.value)}
                  placeholder="main"
                />
              </label>

              <label>
                Repo Status
                <select
                  value={form.repoStatus}
                  onChange={(event) => onFormChange('repoStatus', event.target.value)}
                >
                  <option value="clean">Clean</option>
                  <option value="dirty">Dirty</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={onToggleForm}>Cancel</button>
                <button type="submit" className="primary-button">Create Project</button>
              </div>
            </form>
          </aside>
        </div>
      )}

      <section className="project-list">
        {projects.length > 0 ? (
          projects.map((project) => {
            const repoStatus = project.repoStatus ?? 'clean';
            const repoStatusLabel = {
              clean: 'Clean',
              dirty: 'Dirty',
              unknown: 'Unknown',
            }[repoStatus] ?? 'Unknown';

            return (
              <article
                className={`project-card ${selectedId === project.id ? 'selected' : ''}`}
                key={project.id}
                onClick={() => onSelectProject(project.id)}
              >
                <div className="project-main">
                  <h3>{project.name}</h3>
                  <p>{project.path}</p>
                  {project.gitBranch && (
                    <div className="status-chip">Git: {project.gitBranch}</div>
                  )}
                  <div className="status-chip">Status: {repoStatusLabel}</div>
                  {project.tags.length > 0 && (
                    <div className="tags">
                      {project.tags.map((tag) => (
                        <span key={`${project.id}-${tag}`} className="tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card-actions">
                  <button
                    type="button"
                    className={`favorite-button ${project.favorite ? 'active' : ''}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleFavorite(project.id);
                    }}
                    aria-label={`Toggle favorite for ${project.name}`}
                  >
                    {project.favorite ? '★' : '☆'}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteProject(project.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="empty-state">No projects match your current filter.</div>
        )}
      </section>
    </section>
  );
}
