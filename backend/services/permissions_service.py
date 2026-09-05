import database

LEGACY_AI_TEST_PERMISSION = "admin." + "chat" + "bot.test"

PERMISSIONS = [
    {
        "key": "admin.dashboard.view",
        "label": "Voir le tableau de bord",
        "description": "Acces aux statistiques et a la vue admin principale.",
        "category": "Administration",
    },
    {
        "key": "admin.users.manage",
        "label": "Gerer les utilisateurs",
        "description": "Lister, suspendre, supprimer et changer les roles utilisateurs.",
        "category": "Administration",
    },
    {
        "key": "admin.roles.manage",
        "label": "Gerer les roles",
        "description": "Creer des roles et modifier leurs permissions.",
        "category": "Administration",
    },
    {
        "key": "admin.documents.manage",
        "label": "Moderer les documents",
        "description": "Voir et supprimer les documents de la plateforme.",
        "category": "Contenu",
    },
    {
        "key": "admin.conversations.manage",
        "label": "Moderer les conversations",
        "description": "Consulter et supprimer les conversations utilisateurs.",
        "category": "Contenu",
    },
    {
        "key": "admin.audit.view",
        "label": "Voir le journal d'audit",
        "description": "Consulter les evenements sensibles de la plateforme.",
        "category": "Securite",
    },
    {
        "key": "admin.announcements.manage",
        "label": "Gerer les annonces",
        "description": "Publier, desactiver et supprimer les annonces globales.",
        "category": "Communication",
    },
    {
        "key": "admin.settings.manage",
        "label": "Gerer les parametres",
        "description": "Modifier les limites et reglages runtime.",
        "category": "Administration",
    },
    {
        "key": "admin.ai.test",
        "label": "Tester ENSET AI",
        "description": "Acceder a l'interface de test RAG admin.",
        "category": "Contenu",
    },
    {
        "key": "library.view",
        "label": "Voir la bibliotheque",
        "description": "Acceder a la bibliotheque de documents.",
        "category": "Bibliotheque",
    },
    {
        "key": "library.upload_shared",
        "label": "Partager des documents",
        "description": "Uploader des documents visibles par la plateforme.",
        "category": "Bibliotheque",
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
