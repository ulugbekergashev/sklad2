import sys
import os

# The function is in frontend/api/index.py
# The backend is in frontend/backend
# When running on Vercel, the 'frontend' folder is the root.
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, root)
sys.path.insert(0, os.path.join(root, 'backend'))

# Force Vercel environment flag
os.environ["VERCEL"] = "1"

try:
    from backend.main import app
except Exception as e:
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    import traceback
    
    app = FastAPI()
    
    @app.get("/api/health")
    async def health():
        return {
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc(),
            "sys_path": sys.path,
            "cwd": os.getcwd(),
            "files": os.listdir(root) if os.path.exists(root) else "not found"
        }

    @app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE"])
    async def catch_all(path_name: str):
        return JSONResponse(
            status_code=500,
            content={
                "message": "Backend module import failed",
                "error": str(e),
                "traceback": traceback.format_exc()
            }
        )
