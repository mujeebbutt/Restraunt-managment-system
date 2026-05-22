from sqlalchemy import Column, Enum, Integer, String

from app.core.database import Base


class DiningTable(Base):
    __tablename__ = "tables"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    capacity = Column(Integer, nullable=False)
    shape = Column(
        Enum("square", "round", "rectangle", name="table_shape"),
        nullable=False,
        default="square",
    )
    section = Column(String(100), nullable=True)
    status = Column(
        Enum("free", "occupied", "pending", "reserved", name="table_status"),
        nullable=False,
        default="free",
    )
    sort_order = Column(Integer, default=0, nullable=False)
