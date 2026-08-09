import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class FileIndex(Base):
    """
    Persistent memory for file metadata and summaries.
    Used for incremental indexing via file hashes.
    """
    __tablename__ = "memory_file_index"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    file_path = Column(String(1024), unique=True, nullable=False, index=True)
    file_hash = Column(String(128), nullable=False)
    file_size = Column(Integer, nullable=False)
    language = Column(String(50))
    purpose = Column(Text)
    summary = Column(Text)
    last_indexed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    symbols = relationship("SymbolIndex", back_populates="file", cascade="all, delete-orphan")


class SymbolIndex(Base):
    """
    Persistent memory for code symbols (functions, classes, etc.)
    Allows granular retrieval without reading the whole file.
    """
    __tablename__ = "memory_symbol_index"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    file_id = Column(UUID(as_uuid=True), ForeignKey("memory_file_index.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False, index=True)
    symbol_type = Column(String(50), nullable=False)  # e.g., 'class', 'function', 'variable'
    start_line = Column(Integer)
    end_line = Column(Integer)
    definition = Column(Text)
    summary = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    file = relationship("FileIndex", back_populates="symbols")


class KnowledgeGraphEdge(Base):
    """
    Represents relationships between project entities.
    e.g. File imports File, Symbol calls Symbol, File defines Symbol.
    """
    __tablename__ = "memory_knowledge_graph_edges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    source_type = Column(String(50), nullable=False) # 'file', 'symbol'
    source_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    target_type = Column(String(50), nullable=False) # 'file', 'symbol'
    target_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    relation_type = Column(String(50), nullable=False, index=True) # 'imports', 'calls', 'uses', 'defines'
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class SemanticMemory(Base):
    """
    Persistent semantic facts, decisions, and procedural knowledge.
    """
    __tablename__ = "memory_semantic"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    memory_type = Column(String(50), nullable=False, index=True) # 'semantic', 'episodic', 'procedural', 'decision'
    content = Column(Text, nullable=False)
    importance_score = Column(Float, default=0.5, nullable=False) # 0.0 to 1.0
    confidence = Column(Float, default=1.0, nullable=False)
    valid_from = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
