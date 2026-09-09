from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CompraInsumo, Insumo
from app.schemas.compra_insumo import CompraInsumoCreate, CompraInsumoRead

router = APIRouter(prefix="/compras-insumo", tags=["Compras de insumo"])


@router.get("", response_model=list[CompraInsumoRead])
def list_compras(db: Session = Depends(get_db)):
    return db.query(CompraInsumo).all()


@router.post("", response_model=CompraInsumoRead, status_code=201)
def create_compra(item: CompraInsumoCreate, db: Session = Depends(get_db)):
    insumo = db.get(Insumo, item.insumo_id)
    if insumo is None:
        raise HTTPException(status_code=404, detail="El insumo no existe")

    datos = item.model_dump(exclude={"actualizar_costo_referencia"})
    compra = CompraInsumo(**datos)
    db.add(compra)
    if item.actualizar_costo_referencia:
        insumo.costo_por_unidad_base = item.costo_por_unidad_base
    db.commit()
    db.refresh(compra)
    return compra


@router.put("/{item_id}", response_model=CompraInsumoRead)
def update_compra(item_id: int, item: CompraInsumoCreate, db: Session = Depends(get_db)):
    compra = db.get(CompraInsumo, item_id)
    if compra is None:
        raise HTTPException(status_code=404, detail="No encontrado")
    insumo = db.get(Insumo, item.insumo_id)
    if insumo is None:
        raise HTTPException(status_code=404, detail="El insumo no existe")

    for field, value in item.model_dump(exclude={"actualizar_costo_referencia"}).items():
        setattr(compra, field, value)
    if item.actualizar_costo_referencia:
        insumo.costo_por_unidad_base = item.costo_por_unidad_base
    db.commit()
    db.refresh(compra)
    return compra


@router.delete("/{item_id}", status_code=204)
def delete_compra(item_id: int, db: Session = Depends(get_db)):
    compra = db.get(CompraInsumo, item_id)
    if compra is None:
        raise HTTPException(status_code=404, detail="No encontrado")
    db.delete(compra)
    db.commit()
