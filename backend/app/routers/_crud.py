from typing import Type, TypeVar

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db

ModelT = TypeVar("ModelT")
CreateSchemaT = TypeVar("CreateSchemaT", bound=BaseModel)
ReadSchemaT = TypeVar("ReadSchemaT", bound=BaseModel)


def build_crud_router(
    *,
    model: Type[ModelT],
    create_schema: Type[CreateSchemaT],
    read_schema: Type[ReadSchemaT],
    prefix: str,
    tags: list[str],
) -> APIRouter:
    router = APIRouter(prefix=prefix, tags=tags)

    @router.get("", response_model=list[read_schema])
    def list_items(db: Session = Depends(get_db)):
        return db.query(model).all()

    @router.post("", response_model=read_schema, status_code=201)
    def create_item(item: create_schema, db: Session = Depends(get_db)):
        db_item = model(**item.model_dump())
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        return db_item

    @router.get("/{item_id}", response_model=read_schema)
    def get_item(item_id: int, db: Session = Depends(get_db)):
        db_item = db.get(model, item_id)
        if db_item is None:
            raise HTTPException(status_code=404, detail="No encontrado")
        return db_item

    @router.put("/{item_id}", response_model=read_schema)
    def update_item(item_id: int, item: create_schema, db: Session = Depends(get_db)):
        db_item = db.get(model, item_id)
        if db_item is None:
            raise HTTPException(status_code=404, detail="No encontrado")
        for field, value in item.model_dump().items():
            setattr(db_item, field, value)
        db.commit()
        db.refresh(db_item)
        return db_item

    @router.delete("/{item_id}", status_code=204)
    def delete_item(item_id: int, db: Session = Depends(get_db)):
        db_item = db.get(model, item_id)
        if db_item is None:
            raise HTTPException(status_code=404, detail="No encontrado")
        try:
            db.delete(db_item)
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail="No se puede eliminar: esta en uso por otro registro (por ejemplo, una receta o una venta).",
            )

    return router
