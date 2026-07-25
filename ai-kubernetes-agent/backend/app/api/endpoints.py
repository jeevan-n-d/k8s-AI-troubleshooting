from fastapi import APIRouter, HTTPException
from loguru import logger
from app.models.schemas import InvestigationRequest, InvestigationResult
from app.services.troubleshooter import run_diagnostics

router = APIRouter()

@router.post("/investigate", response_model=InvestigationResult)
async def investigate_cluster(request: InvestigationRequest):
    """
    Trigger cluster health diagnostic run & AI troubleshooting.
    """
    try:
        logger.info(f"API request received: {request}")
        result = run_diagnostics(request)
        return result
    except Exception as e:
        logger.exception("Failed to run diagnostics")
        raise HTTPException(status_code=500, detail=str(e))
