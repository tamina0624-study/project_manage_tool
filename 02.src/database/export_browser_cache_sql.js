// Run in DevTools Console on the page containing the original localStorage data.
(() => {
  const keys = {
    projects: 'projectManagerProjects',
    tickets: 'projectManagerTickets',
    sprints: 'projectManagerSprints',
    recent: 'projectManagerRecent',
  };
  const encoder = new TextEncoder();
  const statements = [];
  const counts = {};

  for (const [key, storageKey] of Object.entries(keys)) {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) continue;
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) {
      throw new Error(`${storageKey} must contain a JSON array. Export cancelled.`);
    }
    // Hex literals avoid dependence on MySQL backslash escaping and SQL mode.
    const hex = Array.from(encoder.encode(JSON.stringify(data)), byte =>
      byte.toString(16).padStart(2, '0')).join('');
    statements.push(
      'INSERT INTO `project_manager_app_state` (`key`, `value`)\n' +
      `VALUES ('${key}', CONVERT(X'${hex}' USING utf8mb4))\n` +
      'ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), `updated_at` = CURRENT_TIMESTAMP;'
    );
    counts[key] = data.length;
  }

  if (!statements.length) {
    throw new Error('No Project Manager data found. Run on the original page and browser profile.');
  }
  const sql = [
    '-- Project Manager localStorage export',
    `-- Exported at: ${new Date().toISOString()}`,
    '-- Existing rows with the exported keys will be replaced, including empty arrays.',
    '-- Run 02.src/database/mysql_setup.sql first if the table does not exist.',
    'USE `ss181301_tamitools`;',
    'START TRANSACTION;',
    ...statements,
    'COMMIT;',
    'SELECT `key`, JSON_LENGTH(`value`) AS `item_count` FROM `project_manager_app_state`;',
    '',
  ].join('\n\n');
  const url = URL.createObjectURL(new Blob([sql], { type: 'application/sql;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mysql_import_browser_cache.sql';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  console.table(counts);
  console.log('Downloaded mysql_import_browser_cache.sql');
})();
