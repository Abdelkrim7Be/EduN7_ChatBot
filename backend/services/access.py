import database


def accessible_doc_ids(user_id: str, role: str = "student") -> set[str]:
    """Return every doc_id this user is allowed to access.

    - admin  : all documents
    - others : own documents + all shared documents
    """
    with database.get_db() as conn:
        if role == "admin":
            rows = conn.execute("SELECT doc_id FROM documents").fetchall()
        else:
            rows = conn.execute(
                "SELECT doc_id FROM documents WHERE user_id=? OR scope='shared'",
                (user_id,),
            ).fetchall()
    return {r["doc_id"] for r in rows}
