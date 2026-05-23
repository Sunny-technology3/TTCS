from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from datetime import datetime

from realtime.realtime_runner import generate_realtime_frames
from core.runtime_state import running_flags

router = APIRouter()

@router.post("/start")
def start_realtime(data: dict):
    class_id = data["classId"]
    running_flags[class_id] = True

    return {"message": "Đã bắt đầu realtime"}


@router.post("/stop")
def stop_realtime(data: dict):
    class_id = data["classId"]

    running_flags[class_id] = False
    
    return {"message": "Đã dừng realtime"}

@router.get("/video-feed/{class_id}")
def video_feed(class_id: str, sessionId: str, cameraUrl: str, endTime: str, token: str):
    running_flags[class_id] = True

    return StreamingResponse(
        generate_realtime_frames(
            class_id,
            sessionId,
            cameraUrl,
            endTime,
            token
        ),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )