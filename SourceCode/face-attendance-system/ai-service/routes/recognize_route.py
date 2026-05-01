from fastapi import APIRouter
import threading
from realtime.realtime_runner import run_realtime
from core.runtime_state import running_flags

router = APIRouter()

@router.post("/start")
def start_realtime(data: dict):
    class_id = data["classId"]
    running_flags[class_id] = True

    thread = threading.Thread(
        target=run_realtime,
        args=(class_id, data["cameraUrl"],),
        daemon=True
    )
    thread.start()

    return {"message": "started"}


@router.post("/stop")
def stop_realtime(data: dict):
    class_id = data["classId"]

    running_flags[class_id] = False
    
    return {"message": "stopped"}
