export function ProjectDetailPanel({ selectedProject, detailForm, commentDraft, onCommentDraftChange, onAddComment, onFieldChange, onSave, onToggleFavorite, onOpenProject }) {
  if (!selectedProject) {
    return (
      <aside className="detail-panel">
        <div className="empty-state">Select a project to view details.</div>
      </aside>
    );
  }

  return (
    <aside className="detail-panel">
      <form className="detail-form" onSubmit={onSave}>
        <h3>Project Details</h3>

        <label>
          Name
          <input
            type="text"
            value={detailForm.name}
            onChange={(event) => onFieldChange('name', event.target.value)}
          />
        </label>

        <label>
          Path
          <input
            type="text"
            value={detailForm.path}
            onChange={(event) => onFieldChange('path', event.target.value)}
          />
        </label>

        <label>
          Tags
          <input
            type="text"
            value={detailForm.tags}
            onChange={(event) => onFieldChange('tags', event.target.value)}
          />
        </label>

        <label>
          Git Branch
          <input
            type="text"
            value={detailForm.gitBranch}
            onChange={(event) => onFieldChange('gitBranch', event.target.value)}
          />
        </label>

        <label>
          Repo Status
          <select
            value={detailForm.repoStatus}
            onChange={(event) => onFieldChange('repoStatus', event.target.value)}
          >
            <option value="clean">Clean</option>
            <option value="dirty">Dirty</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>

        <div className="detail-actions">
          <button type="submit" className="primary-button">Save Changes</button>
          <button type="button" className="secondary-button" onClick={onOpenProject}>
            Open Project
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => onToggleFavorite(selectedProject.id)}
          >
            {selectedProject.favorite ? 'Remove Favorite' : 'Add Favorite'}
          </button>
        </div>
      </form>

      <section className="comments-section">
        <h3>Comments</h3>
        <div className="comment-list">
          {(selectedProject.comments ?? []).map((comment) => (
            <article className="comment-item" key={comment.id}>
              <p>{comment.text}</p>
              <time dateTime={comment.createdAt}>
                {new Date(comment.createdAt).toLocaleString()}
              </time>
            </article>
          ))}
          {(selectedProject.comments ?? []).length === 0 && (
            <p className="comments-empty">No comments yet.</p>
          )}
        </div>
        <form className="comment-form" onSubmit={onAddComment}>
          <textarea
            value={commentDraft}
            onChange={(event) => onCommentDraftChange(event.target.value)}
            placeholder="Write a comment"
            rows="3"
          />
          <button type="submit" className="primary-button">Add Comment</button>
        </form>
      </section>
    </aside>
  );
}
