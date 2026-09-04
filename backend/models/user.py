from dataclasses import dataclass


@dataclass
class UserRecord:
    id: str
    email: str
    name: str
    role: str      # 'student' | 'professor' | 'admin'
    avatar_url: str = ""

    def to_dict(self) -> dict:
        from services.permissions_service import get_role_permissions

        return {
            "id":         self.id,
            "email":      self.email,
            "name":       self.name,
            "role":       self.role,
            "avatar_url": self.avatar_url,
            "permissions": get_role_permissions(self.role),
        }
