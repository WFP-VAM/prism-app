"Simple utility function to add sample users to the database."
from app.database.database import AuthDataBase
from app.database.user_info_model import UserInfoModel

auth_db = AuthDataBase()

users = [
    {
        "username": "admin_01",
        "password": "admin_01_xyz",
        "salt": "false",
        "access": {"province": "01"},
    }
]


def add_users(user_list):
    """Add users to database."""
    for user in user_list:
        user_info = UserInfoModel(**user)
        try:
            auth_db.create_user(user_info)
            print("Added user", user["username"])
        except Exception as error:
            print("Could not add user", user["username"])
            print(error.__cause__)


if __name__ == "__main__":
    add_users(users)
