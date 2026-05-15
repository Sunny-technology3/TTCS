from fastapi import FastAPI
from routes.register_route import router as register_router
from routes.recognize_route import router as recognize_router

app = FastAPI()

app.include_router(register_router, prefix="/api/face")

app.include_router(recognize_router, prefix="/api/attendance")

@app.get("/")

def root():
    return {"message": "AI Service Running"}
