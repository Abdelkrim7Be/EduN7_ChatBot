from dataclasses import dataclass


@dataclass
class UserRecord:
    id: str
    email: str
    name: str
    role: str      # 'student' | 'professor' | 'admin'

    def to_dict(self) -> dict:
        return {
            "id":    self.id,
            "email": self.email,
            "name":  self.name,
            "role":  self.role,
        }
