from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import auth, datasets, labeling, export, spreadsheet
from .database import engine
from .models.base import Base

# Note: In a production environment with migrations, we shouldn't use Base.metadata.create_all
# But for first run/development it's handy.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Eye-Test Data Labeling API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(datasets.router)
app.include_router(labeling.router)
app.include_router(export.router)
app.include_router(spreadsheet.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Eye-Test Data Labeling API"}
