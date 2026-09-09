from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ConfiguracionNegocio
from app.schemas.configuracion_negocio import ConfiguracionNegocioRead, ConfiguracionNegocioUpdate

router = APIRouter(prefix="/configuracion-negocio", tags=["Configuracion del negocio"])

SINGLETON_ID = 1


@router.get("", response_model=ConfiguracionNegocioRead)
def get_configuracion(db: Session = Depends(get_db)):
    config = db.get(ConfiguracionNegocio, SINGLETON_ID)
    if config is None:
        config = ConfiguracionNegocio(id=SINGLETON_ID)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@router.put("", response_model=ConfiguracionNegocioRead)
def update_configuracion(payload: ConfiguracionNegocioUpdate, db: Session = Depends(get_db)):
    config = db.get(ConfiguracionNegocio, SINGLETON_ID)
    if config is None:
        config = ConfiguracionNegocio(id=SINGLETON_ID)
        db.add(config)
    for field, value in payload.model_dump().items():
        setattr(config, field, value)
    db.commit()
    db.refresh(config)
    return config
