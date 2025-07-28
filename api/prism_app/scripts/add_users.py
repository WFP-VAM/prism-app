"Simple utility function to add sample users to the database. Specific to Cambodia."

import secrets
import string

from prism_app.database.database import AuthDataBase
from prism_app.database.user_info_model import UserInfoModel

auth_db = AuthDataBase()

ALPHABET = string.ascii_letters + string.digits
PROVINCES = ["%.2d" % (i + 1) for i in range(26)]

users = [
    {
        "username": "admin_01",
        "password": "admin_01_xyz",
        "access": {"province": "01"},
    }
]


def generate_pasword(length) -> str:
    """Generate a password of defined length."""
    return "".join(secrets.choice(ALPHABET) for i in range(length))


def add_users():
    """Add users to database."""
    for province in PROVINCES:
        user = {
            "username": f"admin_{province}",
            "access": {"province": province},
        }
        user_info = UserInfoModel(**user)
        password = generate_pasword(8)
        user_info.password = password
        try:
            auth_db.create_user(user_info)
            print("Added user", user["username"])
            print(user["username"], password)
        except Exception as error:
            print("Could not add user", user["username"])
            print(error.__cause__)


if __name__ == "__main__":
    add_users()
