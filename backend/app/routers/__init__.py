from fastapi import APIRouter

from app.routers import basics, dishes, mealdb, meta, plan, search, settings, shopping

api_router = APIRouter()
api_router.include_router(dishes.router)
api_router.include_router(meta.router)
api_router.include_router(basics.router)
api_router.include_router(search.router)
api_router.include_router(mealdb.router)
api_router.include_router(plan.router)
api_router.include_router(settings.router)
api_router.include_router(shopping.router)
