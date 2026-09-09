@echo off
REM Levanta backend (FastAPI) y frontend (Next.js) cada uno en su propia ventana.
REM Doble clic para arrancar ambos servidores de desarrollo.

set "ROOT=%~dp0"

start "Backend - FastAPI (:8000)" cmd /k "cd /d "%ROOT%backend" && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"

start "Frontend - Next.js (:3000)" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

echo Backend en http://localhost:8000  (docs: http://localhost:8000/docs)
echo Frontend en http://localhost:3000
echo Cierra las ventanas abiertas para detener los servidores.
