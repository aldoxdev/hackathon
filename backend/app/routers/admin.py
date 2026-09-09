from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.excel_import import import_excel
from app.seed_data import build_demo_data

router = APIRouter(prefix="/admin", tags=["Administracion"])


@router.post("/reset-demo")
def reset_demo(perfil: str = "restaurante", db: Session = Depends(get_db)):
    try:
        build_demo_data(db, perfil=perfil)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"status": "ok"}


@router.post("/import-excel")
async def import_excel_endpoint(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(status_code=400, detail="El archivo debe ser un Excel (.xlsx)")
    contenido = await file.read()
    try:
        return import_excel(db, contenido)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"No se pudo leer el archivo: {exc}")
