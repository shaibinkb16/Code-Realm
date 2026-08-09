from typing import Any, List, Dict
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.cache import memory_cache
from app.services.memory_service import memory_service
from app.models.memory import FileIndex, SymbolIndex, SemanticMemory

router = APIRouter()

@router.post("/ingest")
async def ingest_project_memory(
    background_tasks: BackgroundTasks,
    root_path: str = "e:/Dream",
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Triggers a background ingestion of the project workspace.
    """
    background_tasks.add_task(memory_service.ingest_project, db, root_path)
    return {"message": f"Background ingestion started for {root_path}"}


@router.post("/index")
async def index_specific_file(
    file_path: str,
    file_hash: str,
    file_size: int,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Indexes a specific file manually.
    """
    info = {"hash": file_hash, "size": file_size, "ext": f".{file_path.split('.')[-1]}"}
    await memory_service.index_file(db, file_path, info)
    return {"message": f"Successfully indexed {file_path}"}


@router.get("/context")
async def get_task_context(
    task: str = Query(..., description="The user task or query"),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Context Router: Returns a constrained context package for a given task.
    """
    context = await memory_service.build_context(db, task)
    return context


@router.get("/search")
async def hybrid_search(
    query: str = Query(...),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Searches across FileIndex and SymbolIndex.
    """
    # MVP naive search
    stmt = select(SymbolIndex).where(SymbolIndex.name.ilike(f"%{query}%")).limit(10)
    result = await db.execute(stmt)
    symbols = result.scalars().all()
    
    return {
        "query": query,
        "results": [{"id": s.id, "name": s.name, "type": s.symbol_type} for s in symbols]
    }


@router.get("/file")
async def get_file_intelligence(
    file_path: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Retrieves the intelligence index for a specific file.
    """
    stmt = select(FileIndex).where(FileIndex.file_path == file_path)
    result = await db.execute(stmt)
    file_record = result.scalars().first()
    
    if not file_record:
        raise HTTPException(status_code=404, detail="File not indexed")
        
    return {
        "id": file_record.id,
        "path": file_record.file_path,
        "hash": file_record.file_hash,
        "language": file_record.language,
        "summary": file_record.summary
    }


@router.post("/invalidate")
async def invalidate_memory_cache(
    prefix: str = "context",
) -> Any:
    """
    Invalidates the Redis cache for memory context.
    """
    await memory_cache.invalidate(prefix)
    return {"message": f"Invalidated cache for prefix: {prefix}"}
