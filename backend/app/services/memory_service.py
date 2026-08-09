import os
import hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete

from app.models.memory import FileIndex, SymbolIndex, KnowledgeGraphEdge, SemanticMemory
from app.core.cache import memory_cache
from app.core.logging import logger

# Directories to ignore during ingestion
IGNORE_DIRS = {".git", "node_modules", "dist", "build", "__pycache__", ".venv", "venv", ".next"}
# File extensions to include
INCLUDE_EXTS = {".py", ".ts", ".tsx", ".js", ".jsx", ".md", ".json", ".css"}

class MemoryService:

    async def ingest_project(self, db: AsyncSession, root_path: str):
        """
        Incrementally scan the project, calculate hashes, and index new/modified files.
        """
        logger.info(f"Starting project ingestion at {root_path}")
        
        # 1. Gather current file state
        current_files = {}
        for root, dirs, files in os.walk(root_path):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            for file in files:
                ext = os.path.splitext(file)[1]
                if ext in INCLUDE_EXTS:
                    full_path = os.path.join(root, file)
                    try:
                        with open(full_path, "rb") as f:
                            content = f.read()
                            file_hash = hashlib.sha256(content).hexdigest()
                            current_files[full_path] = {
                                "hash": file_hash,
                                "size": len(content),
                                "ext": ext
                            }
                    except Exception as e:
                        logger.warning(f"Could not read {full_path}: {e}")

        # 2. Compare against database state
        stmt = select(FileIndex)
        result = await db.execute(stmt)
        existing_records = {record.file_path: record for record in result.scalars().all()}

        files_to_index = []
        
        for path, info in current_files.items():
            record = existing_records.get(path)
            if not record:
                # New file
                files_to_index.append(path)
            elif record.file_hash != info["hash"]:
                # Modified file
                files_to_index.append(path)
                
        # Handle deleted files
        for path, record in existing_records.items():
            if path not in current_files:
                logger.info(f"Removing deleted file from memory: {path}")
                await db.delete(record)
                
        await db.commit()

        # 3. Process the files to index
        if files_to_index:
            logger.info(f"Found {len(files_to_index)} changed/new files. Indexing...")
            for path in files_to_index:
                await self.index_file(db, path, current_files[path])
        else:
            logger.info("Project memory is up-to-date. No changes detected.")

        return {"status": "success", "indexed": len(files_to_index)}

    async def index_file(self, db: AsyncSession, file_path: str, info: Dict[str, Any]):
        """
        Extract symbols and update the file index for a single file.
        In a production system, this would call an LLM to generate summaries and extract graph edges.
        """
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                
            # Upsert FileIndex
            stmt = select(FileIndex).where(FileIndex.file_path == file_path)
            result = await db.execute(stmt)
            file_record = result.scalars().first()

            if file_record:
                file_record.file_hash = info["hash"]
                file_record.file_size = info["size"]
                file_record.updated_at = datetime.utcnow()
                # Clear old symbols
                await db.execute(delete(SymbolIndex).where(SymbolIndex.file_id == file_record.id))
            else:
                file_record = FileIndex(
                    file_path=file_path,
                    file_hash=info["hash"],
                    file_size=info["size"],
                    language=info["ext"].lstrip('.')
                )
                db.add(file_record)
            
            await db.flush() # To get the file_record.id

            # Simple mock chunking for MVP
            # A real implementation would parse the AST or use tree-sitter.
            lines = content.split('\n')
            if info["ext"] in [".py", ".ts", ".tsx"]:
                for i, line in enumerate(lines):
                    if line.startswith("def ") or line.startswith("class ") or line.startswith("function ") or "const " in line and "=>" in line:
                        name = line.split(" ")[1].split("(")[0].strip(':')
                        symbol = SymbolIndex(
                            file_id=file_record.id,
                            name=name,
                            symbol_type="callable",
                            start_line=i+1,
                            definition=line
                        )
                        db.add(symbol)

            await db.commit()
            
            # Invalidate cache for this file area
            await memory_cache.invalidate("context:search")
            
        except Exception as e:
            logger.error(f"Error indexing {file_path}: {e}")
            await db.rollback()

    async def build_context(self, db: AsyncSession, task_query: str) -> Dict[str, Any]:
        """
        Context Router & Multi-Level Context Builder.
        Takes a user's task and retrieves only the necessary files and symbols.
        """
        cache_key = f"context:search:{hash(task_query)}"
        cached = await memory_cache.get(cache_key)
        if cached:
            return cached
            
        # 1. Semantic/Keyword Search Phase (Mocked as naive keyword for MVP without pgvector)
        # We query the DB for files or symbols that match the query terms
        terms = task_query.lower().split()
        
        stmt = select(FileIndex)
        result = await db.execute(stmt)
        all_files = result.scalars().all()
        
        relevant_files = []
        for f in all_files:
            if any(term in f.file_path.lower() for term in terms):
                relevant_files.append(f)
                
        # 2. Compile context package
        context_package = {
            "task": task_query,
            "relevant_files": [f.file_path for f in relevant_files],
            "metadata": {
                "total_project_files": len(all_files),
                "budget_used": f"{len(relevant_files)} files"
            }
        }
        
        await memory_cache.set(cache_key, context_package, ttl=3600)
        return context_package

memory_service = MemoryService()
