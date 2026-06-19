from fastapi import APIRouter

from app.services.agent_service import AgentService

router = APIRouter()
service = AgentService()


@router.post("/run")
async def run_agent(task: str) -> dict:
    return await service.run(task)
