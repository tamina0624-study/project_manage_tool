-- Import the locally verified SQLite state into MySQL 8.0+.
-- Source: .local-data/project_manager.sqlite / app_state
-- Target schema matches database/mysql_setup.sql.

USE `ss181301_tamitools`;

START TRANSACTION;

INSERT INTO `project_manager_app_state` (`key`, `value`, `updated_at`)
VALUES (
    'projects',
    JSON_ARRAY(
        JSON_OBJECT(
            'id', 1,
            'name', 'Updated via SQLite',
            'path', '/workspace/test',
            'favorite', TRUE,
            'tags', JSON_ARRAY('sql', 'test'),
            'gitBranch', 'main',
            'repoStatus', 'clean',
            'comments', JSON_ARRAY()
        )
    ),
    '2026-09-20 15:34:57'
)
ON DUPLICATE KEY UPDATE
    `value` = VALUES(`value`),
    `updated_at` = VALUES(`updated_at`);

INSERT INTO `project_manager_app_state` (`key`, `value`, `updated_at`)
VALUES (
    'tickets',
    JSON_ARRAY(
        JSON_OBJECT(
            'id', 101,
            'ticketId', 'EPIC-001',
            'title', 'Application foundation',
            'projectId', 1,
            'sprint', 'Sprint 1',
            'ticketType', 'Epic',
            'parentId', NULL,
            'order', 0,
            'assignee', 'Alice',
            'status', 'doing',
            'notes', ''
        ),
        JSON_OBJECT(
            'id', 102,
            'ticketId', 'TASK-001',
            'title', 'Documentation',
            'projectId', 1,
            'sprint', 'Sprint 1',
            'ticketType', 'Task',
            'parentId', 101,
            'order', 0,
            'assignee', 'Bob',
            'status', 'todo',
            'notes', ''
        ),
        JSON_OBJECT(
            'id', 103,
            'ticketId', 'FEAT-001',
            'title', 'API endpoints',
            'projectId', 2,
            'sprint', '',
            'ticketType', 'Feature',
            'parentId', NULL,
            'order', 0,
            'assignee', '',
            'status', 'done',
            'notes', ''
        )
    ),
    '2026-09-20 15:51:48'
)
ON DUPLICATE KEY UPDATE
    `value` = VALUES(`value`),
    `updated_at` = VALUES(`updated_at`);

COMMIT;

SELECT `id`, `key`, `value`, `updated_at`
FROM `project_manager_app_state`
WHERE `key` IN ('projects', 'tickets')
ORDER BY `id`;
