import uuid
from sqlalchemy import Column, String, Integer, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class Realm(Base):
    __tablename__ = "realms"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    tagline = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    order_num = Column(Integer, nullable=False, index=True)
    is_unlocked = Column(Boolean, default=True, nullable=False)
    theme_color = Column(String(20), nullable=False)
    icon = Column(String(20), nullable=False)

    nodes = relationship("MapNode", back_populates="realm", cascade="all, delete-orphan")

class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(String(50), primary_key=True)
    title = Column(String(150), nullable=False)
    type = Column(String(30), nullable=False, index=True)
    difficulty = Column(String(30), nullable=False)
    description = Column(Text, nullable=False)
    story_context = Column(Text, nullable=True)
    initial_code = Column(Text, nullable=False)
    language = Column(String(20), nullable=False)
    xp_reward = Column(Integer, nullable=False)
    coin_reward = Column(Integer, nullable=False)
    explanation = Column(Text, nullable=False)

    test_cases = relationship("TestCase", back_populates="challenge", cascade="all, delete-orphan")
    nodes = relationship("MapNode", back_populates="challenge")

class MapNode(Base):
    __tablename__ = "map_nodes"

    id = Column(String(50), primary_key=True)
    realm_id = Column(String(50), ForeignKey("realms.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    type = Column(String(30), nullable=False)
    x_coord = Column(Integer, nullable=False)
    y_coord = Column(Integer, nullable=False)
    challenge_id = Column(String(50), ForeignKey("challenges.id", ondelete="SET NULL"), nullable=True)
    boss_id = Column(String(50), nullable=True)
    prerequisites = Column(JSON, default=list, nullable=False)
    icon_name = Column(String(50), nullable=False)

    realm = relationship("Realm", back_populates="nodes")
    challenge = relationship("Challenge", back_populates="nodes")

class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    challenge_id = Column(String(50), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False)
    input_data = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=False)
    description = Column(String(255), nullable=False)
    is_hidden = Column(Boolean, default=False, nullable=False)

    challenge = relationship("Challenge", back_populates="test_cases")
