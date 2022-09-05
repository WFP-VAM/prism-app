from typing import Optional

from databases import Database
from sqlalchemy import (BIGINT, VARCHAR, Boolean, Column, ForeignKeyConstraint,
                        select)
from sqlalchemy.ext.declarative import declarative_base

from .mixins import MysqlPrimaryKeyMixin

Base = declarative_base()


class UserZoneAccessModel(Base, MysqlPrimaryKeyMixin):
    __tablename__ = "user_zone_access"
    user_id = Column("user_id", BIGINT(), nullable=False)
    zones_url = Column("zones_url", VARCHAR(length=255), nullable=False)
    has_access = Column("has_access", Boolean, nullable=False)

    ForeignKeyConstraint(
        ["user_id"], ["users.id"], name="fk_user_zone_access_user_id_users"
    )

    @staticmethod
    async def has_access(
        connection: Database, user_id: int, zones_url: str
    ) -> Optional[dict]:
        query = (
            select([UserZoneAccessModel])
            .where(
                UserZoneAccessModel.user_id == user_id,
                UserZoneAccessModel.zones_url == zones_url,
            )
            .limit(1)
        )
        result = await connection.fetch_one(query)
        return bool(result.has_access) if result else None
