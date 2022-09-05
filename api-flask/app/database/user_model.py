from typing import Optional

from databases import Database
from sqlalchemy import VARCHAR, Column, select
from sqlalchemy.ext.declarative import declarative_base

from .mixins import MysqlPrimaryKeyMixin, MysqlTimestampsMixin

Base = declarative_base()


class UserModel(Base, MysqlPrimaryKeyMixin, MysqlTimestampsMixin):
    __tablename__ = "users"
    username = Column("username", VARCHAR(length=255), nullable=False, unique=True)
    full_name = Column("full_name", VARCHAR(length=255), nullable=True)
    email = Column("email", VARCHAR(length=255), nullable=False)
    hashed_password = Column("hashed_password", VARCHAR(length=64), nullable=False)

    @staticmethod
    async def get_user_by_username(
        connection: Database, username: str
    ) -> Optional[dict]:
        query = select([UserModel]).where(UserModel.username == username).limit(1)
        return await connection.fetch_one(query)


# {
#     "johndoe": {
#         "username": "johndoe",
#         "full_name": "John Doe",
#         "email": "johndoe@example.com",
#         "hashed_password": "5b11618c2e44027877d0cd0921ed166b9f176f50587fc91e7534dd2946db77d6",
#     },
# }
