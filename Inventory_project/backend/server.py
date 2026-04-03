from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent

# load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = "mongodb://localhost:27017"
client = AsyncIOMotorClient(mongo_url)
# db = client[os.environ['DB_NAME']]
db = client["test"]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class Component(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    unit: str
    quantity: float
    category: str = "General"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ComponentUpdate(BaseModel):
    quantity: float

class MotorRequirement(BaseModel):
    motor_type: str
    component_id: str
    component_name: str
    required_quantity: float

class WithdrawRequest(BaseModel):
    motor_type: str
    quantity: int

class FeasibilityRequest(BaseModel):
    hp_3: int = 0
    hp_5: int = 0
    hp_7_5: int = 0

class FeasibilityResponse(BaseModel):
    possible: bool
    message: str
    missing_components: Optional[List[Dict]] = None


# Seed initial data
async def seed_database():
    # Always reseed motor requirements (they may have been updated)
    await db.motor_requirements.delete_many({})
    
    # Only seed components if they don't exist
    count = await db.components.count_documents({})
    if count > 0:
        # Components exist, only insert motor requirements
        motor_reqs = get_motor_requirements_data()
        if motor_reqs:
            await db.motor_requirements.insert_many(motor_reqs)
        return
    
    # Seed both components and requirements
    components = get_initial_components()
    for comp in components:
        comp['created_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.components.insert_many(components)
    
    motor_reqs = get_motor_requirements_data()
    if motor_reqs:
        await db.motor_requirements.insert_many(motor_reqs)


def get_initial_components():
    return [
        {"id": "comp_1", "name": "Connector MC-4", "unit": "Set", "quantity": 200, "category": "Electrical"},
        {"id": "comp_2", "name": "Bitumen Tape", "unit": "Nos", "quantity": 200, "category": "Accessories"},
        {"id": "comp_3", "name": "Teflon Tape", "unit": "Nos", "quantity": 200, "category": "Accessories"},
        {"id": "comp_4", "name": "PVC Electrical Insulation Tape", "unit": "Nos", "quantity": 200, "category": "Accessories"},
        {"id": "comp_5", "name": "Cable Red (4 sq mm)", "unit": "Mtr", "quantity": 200, "category": "Electrical"},
        {"id": "comp_6", "name": "Cable Black (4 sq mm)", "unit": "Mtr", "quantity": 200, "category": "Electrical"},
        {"id": "comp_7", "name": "Flat Cable (3CX 2.5 sq mm)", "unit": "Mtr", "quantity": 200, "category": "Electrical"},
        {"id": "comp_8", "name": "Earthing Cable (1.5m)", "unit": "Nos", "quantity": 200, "category": "Electrical"},
        {"id": "comp_9", "name": "Lightning Arrestor Assembly", "unit": "Set", "quantity": 200, "category": "Safety"},
        {"id": "comp_10", "name": "Arrestor Spike", "unit": "Set", "quantity": 200, "category": "Safety"},
        {"id": "comp_11", "name": "Arrestor Rod 14mm", "unit": "Nos", "quantity": 200, "category": "Safety"},
        {"id": "comp_12", "name": "Earthing Rod (14mm x 1m)", "unit": "Set", "quantity": 200, "category": "Safety"},
        {"id": "comp_13", "name": "GI Pipe", "unit": "Nos", "quantity": 200, "category": "Plumbing"},
        {"id": "comp_14", "name": "Earthing Patti", "unit": "Nos", "quantity": 200, "category": "Safety"},
        {"id": "comp_15", "name": "Earthing Pit", "unit": "Nos", "quantity": 200, "category": "Safety"},
        {"id": "comp_16", "name": "HDPE Pipe 63mm", "unit": "Mtr", "quantity": 200, "category": "Plumbing"},
        {"id": "comp_17", "name": "HDPE Pipe 75mm", "unit": "Mtr", "quantity": 200, "category": "Plumbing"},
        {"id": "comp_18", "name": "Cable Tie", "unit": "Pkt", "quantity": 200, "category": "Accessories"},
        {"id": "comp_19", "name": "35mm Sleeve", "unit": "Mtr", "quantity": 200, "category": "Accessories"},
        {"id": "comp_20", "name": "SS Nipple 2\"", "unit": "Nos", "quantity": 200, "category": "Plumbing"},
        {"id": "comp_21", "name": "PP Rope 12mm", "unit": "Mtr", "quantity": 200, "category": "Accessories"},
        {"id": "comp_22", "name": "6 sq mm Ring Lugs", "unit": "Nos", "quantity": 200, "category": "Electrical"},
        {"id": "comp_23", "name": "Hose Clamp 2\"", "unit": "Nos", "quantity": 200, "category": "Plumbing"},
        {"id": "comp_24", "name": "M6 x 50 GI Nut & Bolt", "unit": "Nos", "quantity": 200, "category": "Hardware"},
        {"id": "comp_25", "name": "M8 x 75 SS Nut & Bolt", "unit": "Nos", "quantity": 200, "category": "Hardware"},
        {"id": "comp_26", "name": "Chemical Bag (5kg)", "unit": "Bag", "quantity": 200, "category": "Accessories"},
    ]


def get_motor_requirements_data():
    # Motor requirements based on PDFs
    motor_requirements = [
        # 3HP Requirements (from 3HP-30M BOS Packing List.pdf)
        {"motor_type": "3HP", "component_id": "comp_1", "component_name": "Connector MC-4", "required_quantity": 4},
        {"motor_type": "3HP", "component_id": "comp_2", "component_name": "Bitumen Tape", "required_quantity": 1},
        {"motor_type": "3HP", "component_id": "comp_3", "component_name": "Teflon Tape", "required_quantity": 1},
        {"motor_type": "3HP", "component_id": "comp_4", "component_name": "PVC Electrical Insulation Tape", "required_quantity": 1},
        {"motor_type": "3HP", "component_id": "comp_5", "component_name": "Cable Red (4 sq mm)", "required_quantity": 4},
        {"motor_type": "3HP", "component_id": "comp_6", "component_name": "Cable Black (4 sq mm)", "required_quantity": 4},
        {"motor_type": "3HP", "component_id": "comp_7", "component_name": "Flat Cable (3CX 2.5 sq mm)", "required_quantity": 30},
        {"motor_type": "3HP", "component_id": "comp_8", "component_name": "Earthing Cable (1.5m)", "required_quantity": 1},
        {"motor_type": "3HP", "component_id": "comp_9", "component_name": "Lightning Arrestor Assembly", "required_quantity": 1},
        {"motor_type": "3HP", "component_id": "comp_12", "component_name": "Earthing Rod (14mm x 1m)", "required_quantity": 2},
        {"motor_type": "3HP", "component_id": "comp_15", "component_name": "Earthing Pit", "required_quantity": 2},
        {"motor_type": "3HP", "component_id": "comp_16", "component_name": "HDPE Pipe 63mm", "required_quantity": 30},
        {"motor_type": "3HP", "component_id": "comp_18", "component_name": "Cable Tie", "required_quantity": 1},
        {"motor_type": "3HP", "component_id": "comp_19", "component_name": "35mm Sleeve", "required_quantity": 8},
        {"motor_type": "3HP", "component_id": "comp_20", "component_name": "SS Nipple 2\"", "required_quantity": 1},
        {"motor_type": "3HP", "component_id": "comp_21", "component_name": "PP Rope 12mm", "required_quantity": 35},
        {"motor_type": "3HP", "component_id": "comp_22", "component_name": "6 sq mm Ring Lugs", "required_quantity": 4},
        {"motor_type": "3HP", "component_id": "comp_23", "component_name": "Hose Clamp 2\"", "required_quantity": 1},
        {"motor_type": "3HP", "component_id": "comp_24", "component_name": "M6 x 50 GI Nut & Bolt", "required_quantity": 3},
        {"motor_type": "3HP", "component_id": "comp_25", "component_name": "M8 x 75 SS Nut & Bolt", "required_quantity": 1},
        {"motor_type": "3HP", "component_id": "comp_26", "component_name": "Chemical Bag (5kg)", "required_quantity": 2},
        
        # 5HP Requirements (from 5HP-30M BOS Packing List.pdf)
        {"motor_type": "5HP", "component_id": "comp_1", "component_name": "Connector MC-4", "required_quantity": 4},
        {"motor_type": "5HP", "component_id": "comp_2", "component_name": "Bitumen Tape", "required_quantity": 1},
        {"motor_type": "5HP", "component_id": "comp_3", "component_name": "Teflon Tape", "required_quantity": 1},
        {"motor_type": "5HP", "component_id": "comp_4", "component_name": "PVC Electrical Insulation Tape", "required_quantity": 1},
        {"motor_type": "5HP", "component_id": "comp_5", "component_name": "Cable Red (4 sq mm)", "required_quantity": 5},
        {"motor_type": "5HP", "component_id": "comp_6", "component_name": "Cable Black (4 sq mm)", "required_quantity": 5},
        {"motor_type": "5HP", "component_id": "comp_8", "component_name": "Earthing Cable (1.5m)", "required_quantity": 1},
        {"motor_type": "5HP", "component_id": "comp_10", "component_name": "Arrestor Spike", "required_quantity": 1},
        {"motor_type": "5HP", "component_id": "comp_11", "component_name": "Arrestor Rod 14mm", "required_quantity": 1},
        {"motor_type": "5HP", "component_id": "comp_12", "component_name": "Earthing Rod (14mm x 1m)", "required_quantity": 2},
        {"motor_type": "5HP", "component_id": "comp_13", "component_name": "GI Pipe", "required_quantity": 1},
        {"motor_type": "5HP", "component_id": "comp_14", "component_name": "Earthing Patti", "required_quantity": 1},
        {"motor_type": "5HP", "component_id": "comp_15", "component_name": "Earthing Pit", "required_quantity": 2},
        {"motor_type": "5HP", "component_id": "comp_17", "component_name": "HDPE Pipe 75mm", "required_quantity": 30},
        {"motor_type": "5HP", "component_id": "comp_18", "component_name": "Cable Tie", "required_quantity": 1},
        {"motor_type": "5HP", "component_id": "comp_19", "component_name": "35mm Sleeve", "required_quantity": 10},
        {"motor_type": "5HP", "component_id": "comp_20", "component_name": "SS Nipple 2\"", "required_quantity": 1},
        {"motor_type": "5HP", "component_id": "comp_21", "component_name": "PP Rope 12mm", "required_quantity": 35},
        {"motor_type": "5HP", "component_id": "comp_22", "component_name": "6 sq mm Ring Lugs", "required_quantity": 2},
        {"motor_type": "5HP", "component_id": "comp_23", "component_name": "Hose Clamp 2\"", "required_quantity": 1},
        {"motor_type": "5HP", "component_id": "comp_24", "component_name": "M6 x 50 GI Nut & Bolt", "required_quantity": 2},
        {"motor_type": "5HP", "component_id": "comp_25", "component_name": "M8 x 75 SS Nut & Bolt", "required_quantity": 1},
        {"motor_type": "5HP", "component_id": "comp_26", "component_name": "Chemical Bag (5kg)", "required_quantity": 1},
        
        # 7.5HP Requirements (from 7.5HP-50M BOS Packing List.pdf)
        {"motor_type": "7.5HP", "component_id": "comp_1", "component_name": "Connector MC-4", "required_quantity": 4},
        {"motor_type": "7.5HP", "component_id": "comp_2", "component_name": "Bitumen Tape", "required_quantity": 1},
        {"motor_type": "7.5HP", "component_id": "comp_3", "component_name": "Teflon Tape", "required_quantity": 1},
        {"motor_type": "7.5HP", "component_id": "comp_4", "component_name": "PVC Electrical Insulation Tape", "required_quantity": 1},
        {"motor_type": "7.5HP", "component_id": "comp_5", "component_name": "Cable Red (4 sq mm)", "required_quantity": 13},
        {"motor_type": "7.5HP", "component_id": "comp_6", "component_name": "Cable Black (4 sq mm)", "required_quantity": 13},
        {"motor_type": "7.5HP", "component_id": "comp_8", "component_name": "Earthing Cable (1.5m)", "required_quantity": 1},
        {"motor_type": "7.5HP", "component_id": "comp_10", "component_name": "Arrestor Spike", "required_quantity": 1},
        {"motor_type": "7.5HP", "component_id": "comp_11", "component_name": "Arrestor Rod 14mm", "required_quantity": 1},
        {"motor_type": "7.5HP", "component_id": "comp_12", "component_name": "Earthing Rod (14mm x 1m)", "required_quantity": 2},
        {"motor_type": "7.5HP", "component_id": "comp_13", "component_name": "GI Pipe", "required_quantity": 1},
        {"motor_type": "7.5HP", "component_id": "comp_14", "component_name": "Earthing Patti", "required_quantity": 1},
        {"motor_type": "7.5HP", "component_id": "comp_15", "component_name": "Earthing Pit", "required_quantity": 2},
        {"motor_type": "7.5HP", "component_id": "comp_17", "component_name": "HDPE Pipe 75mm", "required_quantity": 50},
        {"motor_type": "7.5HP", "component_id": "comp_18", "component_name": "Cable Tie", "required_quantity": 1},
        {"motor_type": "7.5HP", "component_id": "comp_19", "component_name": "35mm Sleeve", "required_quantity": 26},
        {"motor_type": "7.5HP", "component_id": "comp_20", "component_name": "SS Nipple 2\"", "required_quantity": 1},
        {"motor_type": "7.5HP", "component_id": "comp_21", "component_name": "PP Rope 12mm", "required_quantity": 55},
        {"motor_type": "7.5HP", "component_id": "comp_22", "component_name": "6 sq mm Ring Lugs", "required_quantity": 2},
        {"motor_type": "7.5HP", "component_id": "comp_23", "component_name": "Hose Clamp 2\"", "required_quantity": 1},
        {"motor_type": "7.5HP", "component_id": "comp_24", "component_name": "M6 x 50 GI Nut & Bolt", "required_quantity": 2},
        {"motor_type": "7.5HP", "component_id": "comp_25", "component_name": "M8 x 75 SS Nut & Bolt", "required_quantity": 1},
        {"motor_type": "7.5HP", "component_id": "comp_26", "component_name": "Chemical Bag (5kg)", "required_quantity": 1},
    ]
    return motor_requirements


@app.on_event("startup")
async def startup_event():
    # Clear and reseed motor requirements on every startup
    await db.motor_requirements.delete_many({})
    await seed_database()


# API Routes
@api_router.get("/")
async def root():
    return {"message": "Solar Pump Inventory Management System API"}


@api_router.get("/components", response_model=List[Component])
async def get_components():
    components = await db.components.find({}, {"_id": 0}).to_list(1000)
    for comp in components:
        if isinstance(comp['created_at'], str):
            comp['created_at'] = datetime.fromisoformat(comp['created_at'])
    return components


@api_router.put("/components/{component_id}")
async def update_component(component_id: str, update: ComponentUpdate):
    result = await db.components.update_one(
        {"id": component_id},
        {"$set": {"quantity": update.quantity}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Component not found")
    
    component = await db.components.find_one({"id": component_id}, {"_id": 0})
    if component and isinstance(component['created_at'], str):
        component['created_at'] = datetime.fromisoformat(component['created_at'])
    return component


@api_router.get("/motor-requirements")
async def get_motor_requirements():
    requirements = await db.motor_requirements.find({}, {"_id": 0}).to_list(1000)
    return requirements


@api_router.get("/calculate-max-production")
async def calculate_max_production():
    components = await db.components.find({}, {"_id": 0}).to_list(1000)
    requirements = await db.motor_requirements.find({}, {"_id": 0}).to_list(1000)
    
    # Create component lookup
    component_map = {comp['id']: comp['quantity'] for comp in components}
    component_name_map = {comp['id']: comp['name'] for comp in components}
    
    # Group requirements by motor type
    motor_types = ['3HP', '5HP', '7.5HP']
    max_production = {}
    critical_components = {}
    
    for motor_type in motor_types:
        motor_reqs = [r for r in requirements if r['motor_type'] == motor_type]
        
        if not motor_reqs:
            max_production[motor_type] = 0
            critical_components[motor_type] = None
            continue
        
        # Calculate max motors based on minimum ratio and find critical component
        max_motors = float('inf')
        critical_comp_id = None
        
        for req in motor_reqs:
            available = component_map.get(req['component_id'], 0)
            required = req['required_quantity']
            
            if required > 0:
                possible = int(available // required)
                if possible < max_motors:
                    max_motors = possible
                    critical_comp_id = req['component_id']
        
        max_production[motor_type] = max_motors if max_motors != float('inf') else 0
        critical_components[motor_type] = component_name_map.get(critical_comp_id) if critical_comp_id else None
    
    return {
        "production": max_production,
        "critical_components": critical_components
    }


@api_router.post("/withdraw")
async def withdraw_components(request: WithdrawRequest):
    if request.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")
    
    # Get requirements for this motor type
    requirements = await db.motor_requirements.find(
        {"motor_type": request.motor_type},
        {"_id": 0}
    ).to_list(1000)
    
    if not requirements:
        raise HTTPException(status_code=404, detail="Motor type not found")
    
    # Check if withdrawal is possible
    components = await db.components.find({}, {"_id": 0}).to_list(1000)
    component_map = {comp['id']: comp for comp in components}
    
    insufficient = []
    for req in requirements:
        comp = component_map.get(req['component_id'])
        if comp:
            needed = req['required_quantity'] * request.quantity
            if comp['quantity'] < needed:
                insufficient.append({
                    "component": req['component_name'],
                    "needed": needed,
                    "available": comp['quantity'],
                    "shortage": needed - comp['quantity']
                })
    
    if insufficient:
        return {
            "success": False,
            "message": "Insufficient components",
            "insufficient_components": insufficient
        }
    
    # Perform withdrawal
    for req in requirements:
        needed = req['required_quantity'] * request.quantity
        await db.components.update_one(
            {"id": req['component_id']},
            {"$inc": {"quantity": -needed}}
        )
    
    return {
        "success": True,
        "message": f"Successfully withdrawn components for {request.quantity} x {request.motor_type} motors"
    }


@api_router.post("/check-feasibility", response_model=FeasibilityResponse)
async def check_feasibility(request: FeasibilityRequest):
    if request.hp_3 < 0 or request.hp_5 < 0 or request.hp_7_5 < 0:
        raise HTTPException(status_code=400, detail="Quantities cannot be negative")
    
    # Get all requirements
    requirements = await db.motor_requirements.find({}, {"_id": 0}).to_list(1000)
    components = await db.components.find({}, {"_id": 0}).to_list(1000)
    
    # Calculate total needed for each component
    component_map = {comp['id']: comp['quantity'] for comp in components}
    total_needed = {}
    
    for req in requirements:
        comp_id = req['component_id']
        if comp_id not in total_needed:
            total_needed[comp_id] = {"name": req['component_name'], "quantity": 0}
        
        if req['motor_type'] == '3HP':
            total_needed[comp_id]['quantity'] += req['required_quantity'] * request.hp_3
        elif req['motor_type'] == '5HP':
            total_needed[comp_id]['quantity'] += req['required_quantity'] * request.hp_5
        elif req['motor_type'] == '7.5HP':
            total_needed[comp_id]['quantity'] += req['required_quantity'] * request.hp_7_5
    
    # Check availability
    missing = []
    for comp_id, needed_info in total_needed.items():
        available = component_map.get(comp_id, 0)
        if available < needed_info['quantity']:
            missing.append({
                "component": needed_info['name'],
                "needed": needed_info['quantity'],
                "available": available,
                "shortage": needed_info['quantity'] - available
            })
    
    if missing:
        return FeasibilityResponse(
            possible=False,
            message="Not Possible - Insufficient components",
            missing_components=missing
        )
    
    return FeasibilityResponse(
        possible=True,
        message="Possible - All components available",
        missing_components=None
    )


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
