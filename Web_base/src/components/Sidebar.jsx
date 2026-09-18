export function Sidebar({ route, onNavigate, recentProjects, onSelectProject, theme, onToggleTheme }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>Project Manager</h1>
        <button type="button" className="theme-toggle" onClick={onToggleTheme}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
      <nav>
        <button
          type="button"
          className={`nav-button ${route === 'all' ? 'active' : ''}`}
          onClick={() => onNavigate('all')}
        >
          All
        </button>
        <button
          type="button"
          className={`nav-button ${route === 'favorites' ? 'active' : ''}`}
          onClick={() => onNavigate('favorites')}
        >
          Favorites
        </button>
        <button
          type="button"
          className={`nav-button ${route === 'recent' ? 'active' : ''}`}
          onClick={() => onNavigate('recent')}
        >
          Recent
        </button>
        <button
          type="button"
          className={`nav-button ${route === 'board' ? 'active' : ''}`}
          onClick={() => onNavigate('board')}
        >
          Board
        </button>
        <button
          type="button"
          className={`nav-button ${route === 'schedule' ? 'active' : ''}`}
          onClick={() => onNavigate('schedule')}
        >
          Schedule
        </button>
        <button
          type="button"
          className={`nav-button ${route === 'tickets' ? 'active' : ''}`}
          onClick={() => onNavigate('tickets')}
        >
          Tickets
        </button>
      </nav>

      <div className="recent-section">
        <h3>Recently Opened</h3>
        {recentProjects.length > 0 ? (
          <ul className="recent-list">
            {recentProjects.map((project) => (
              <li key={`recent-${project.id}`}>
                <button type="button" onClick={() => onSelectProject(project.id)}>
                  {project.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="recent-empty">No recent projects yet.</p>
        )}
      </div>
    </aside>
  );
}
