from sqlalchemy import BIGINT, Column


class MysqlPrimaryKeyMixin:
    id = Column("id", BIGINT(), primary_key=True, autoincrement=True)
