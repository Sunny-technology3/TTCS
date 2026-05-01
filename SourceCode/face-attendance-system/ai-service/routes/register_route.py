from fastapi import APIRouter, UploadFile, File
from services.face_register_service import register_face

router = APIRouter()

@router.post("/register")
async def register(file: UploadFile = File(...)):
    try:
        contents = await file.read()

        result = register_face(contents)

        return {
            "success": True,
            "data": result
        }

    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }
