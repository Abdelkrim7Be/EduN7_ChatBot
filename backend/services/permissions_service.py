import database

LEGACY_AI_TEST_PERMISSION = "admin." + "chat" + "bot.test"

PERMISSIONS = [
    {
        "key": "admin.dashboard.view",
        "label": "View Dashboard",
        "description": "Access statistics and the main admin view.",
        "category": "Administration",
    },
    {
        "key": "admin.users.manage",
        "label": "Manage Users",
        "description": "List, suspend, delete, and change user roles.",
        "category": "Administration",
    },
    {
        "key": "admin.roles.manage",
        "label": "Manage Roles",
        "description": "Create roles and edit their permissions.",
        "category": "Administration",
    },
    {
        "key": "admin.documents.manage",
        "label": "Moderate Documents",
        "description": "View and delete platform documents.",
        "category": "Content",
    },
    {
        "key": "admin.conversations.manage",
        "label": "Moderate Conversations",
        "description": "Review and delete user conversations.",
        "category": "Content",
    },
    {
        "key": "admin.audit.view",
        "label": "View Audit Log",
        "description": "Review sensitive platform events.",
        "category": "Security",
    },
    {
        "key": "admin.announcements.manage",
        "label": "Manage Announcements",
        "description": "Publish, disable, and delete global announcements.",
        "category": "Communication",
    },
    {
        "key": "admin.settings.manage",
        "label": "Manage Settings",
        "description": "Edit limits and runtime settings.",
        "category": "Administration",
    },
    {
        "key": "admin.health.view",
        "label": "View Platform Health",
        "description": "Inspect service readiness and configuration status.",
        "category": "Administration",
    },
    {
        "key": "admin.ai.test",
        "label": "Test ENSET AI",
        "description": "Access the admin RAG testing interface.",
        "category": "Content",
    },
    {
        "key": "library.view",
        "label": "View Library",
        "description": "Access the document library.",
        "category": "Library",
    },
    {
        "key": "library.upload_shared",
        "label": "Share Documents",
        "description": "Upload documents visible to the platform.",
        "category": "Library",
    },
]

PERMISSION_KEYS = {p["key"] for p in PERMISSIONS}

BUILTIN_ROLE_PERMISSIONS = {
    "student": set(),
    "professor": {"library.view", "library.upload_shared"},
    "admin": set(PERMISSION_KEYS),
}

ENDPOINT_PERMISSIONS = {
    "admin.stats": "admin.dashboard.view",
    "admin.extended_stats": "admin.dashboard.view",
    "admin.list_users": "admin.users.manage",
    "admin.update_role": "admin.users.manage",
    "admin.delete_user": "admin.users.manage",
    "admin.suspend_user": "admin.users.manage",
    "admin.get_roles": "admin.roles.manage",
    "admin.create_role": "admin.roles.manage",
    "admin.delete_role": "admin.roles.manage",
    "admin.update_role_permissions": "admin.roles.manage",
    "admin.list_shared_documents": "admin.documents.manage",
    "admin.preview_document_file": "admin.documents.manage",
    "admin.delete_document": "admin.documents.manage",
    "admin.list_conversations": "admin.conversations.manage",
    "admin.get_conversation": "admin.conversations.manage",
    "admin.delete_conversation": "admin.conversations.manage",
    "admin.get_settings": "admin.settings.manage",
    "admin.update_setting": "admin.settings.manage",
    "admin.public_assistant_model_options": "admin.settings.manage",
    "admin.public_assistant_preview": "admin.settings.manage",
    "admin.platform_health": "admin.health.view",
    "admin.get_audit_log": "admin.audit.view",
    "admin.list_announcements": "admin.announcements.manage",
    "admin.create_announcement": "admin.announcements.manage",
    "admin.delete_announcement": "admin.announcements.manage",
    "admin.toggle_announcement": "admin.announcements.manage",
}


def normalize_permissions(values: list[str] | None) -> list[str]:
    if not values:
        return []
    return sorted({p for p in values if p in PERMISSION_KEYS})


def get_role_permissions(role: str) -> list[str]:
    with database.get_db() as conn:
        rows = conn.execute(
            "SELECT permission FROM role_permissions WHERE role_name=? ORDER BY permission",
            (role,),
        ).fetchall()
    return [r["permission"] for r in rows]


def role_has_permission(role: str, permission: str) -> bool:
    if permission not in PERMISSION_KEYS:
        return False
    with database.get_db() as conn:
        row = conn.execute(
            "SELECT 1 FROM role_permissions WHERE role_name=? AND permission=?",
            (role, permission),
        ).fetchone()
    return row is not None


def set_role_permissions(role: str, permissions: list[str]) -> list[str]:
    normalized = normalize_permissions(permissions)
    with database.get_db() as conn:
        conn.execute("DELETE FROM role_permissions WHERE role_name=?", (role,))
        conn.executemany(
            "INSERT INTO role_permissions (role_name, permission) VALUES (?, ?)",
            [(role, p) for p in normalized],
        )
    return normalized


def seed_builtin_permissions(conn) -> None:
    conn.execute(
        "UPDATE role_permissions SET permission=? WHERE permission=?",
        ("admin.ai.test", LEGACY_AI_TEST_PERMISSION),
    )
    for role, permissions in BUILTIN_ROLE_PERMISSIONS.items():
        for permission in permissions:
            conn.execute(
                "INSERT OR IGNORE INTO role_permissions (role_name, permission) VALUES (?, ?)",
                (role, permission),
            )
