from fastapi import APIRouter

from app.api.v1.endpoints import (
	agent,
	agri_flow,
	auth,
	chat,
	market,
	prediction,
	profile,
	rag,
	recommendation,
	system,
	voice,
	weather,
)

api_router = APIRouter()
api_router.include_router(system.router)
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(profile.router)
api_router.include_router(agri_flow.router)
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(rag.router, prefix="/rag", tags=["rag"])
api_router.include_router(agent.router, prefix="/agent", tags=["agent"])
api_router.include_router(prediction.router, prefix="/prediction", tags=["prediction"])
api_router.include_router(market.router)
api_router.include_router(recommendation.router)
api_router.include_router(weather.router)
api_router.include_router(voice.router)
