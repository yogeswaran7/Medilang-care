from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'medilang_care')]

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app
app = FastAPI(title="MediLang Care API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ========== MODELS ==========

class Medicine(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    dosage: str
    morning: bool = False
    afternoon: bool = False
    night: bool = False
    duration_days: int = 7
    instructions: str = ""

class Prescription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    raw_ocr_text: str = ""
    medicines: List[Medicine] = []
    ai_explanation: str = ""
    language: str = "en"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    image_base64: Optional[str] = None

class PrescriptionCreate(BaseModel):
    user_id: str
    image_base64: str
    language: str = "en"

class RoutineEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    medicine_name: str
    dosage: str
    time_slot: str  # morning, afternoon, night
    instructions: str = ""
    start_date: datetime = Field(default_factory=datetime.utcnow)
    end_date: Optional[datetime] = None
    is_active: bool = True

class RoutineEntryCreate(BaseModel):
    user_id: str
    medicine_name: str
    dosage: str
    time_slot: str
    instructions: str = ""
    duration_days: int = 7

class DoseLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    routine_id: str
    medicine_name: str
    time_slot: str
    scheduled_date: str  # YYYY-MM-DD
    status: str = "pending"  # pending, taken, missed
    taken_at: Optional[datetime] = None
    notes: str = ""

class DoseLogCreate(BaseModel):
    user_id: str
    routine_id: str
    medicine_name: str
    time_slot: str
    scheduled_date: str
    status: str = "taken"
    notes: str = ""

class UserProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    age: int = 0
    language: str = "en"  # en, hi, ta
    profile_photo: Optional[str] = None
    super_user_name: Optional[str] = None
    super_user_phone: Optional[str] = None
    super_user_language: str = "en"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserProfileCreate(BaseModel):
    name: str
    age: int = 0
    language: str = "en"

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    language: Optional[str] = None
    profile_photo: Optional[str] = None
    super_user_name: Optional[str] = None
    super_user_phone: Optional[str] = None
    super_user_language: Optional[str] = None

# ========== LANGUAGE HELPERS ==========

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable format"""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == "_id":
                continue  # Skip MongoDB _id field
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, dict):
                result[key] = serialize_doc(value)
            elif isinstance(value, list):
                result[key] = serialize_doc(value)
            else:
                result[key] = value
        return result
    return doc

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "ta": "Tamil"
}

def get_system_prompt(language: str) -> str:
    lang_name = LANGUAGE_NAMES.get(language, "English")
    return f"""You are a helpful medical assistant explaining prescriptions to elderly patients in very simple language. 
Never use medical jargon. Always be warm and reassuring.
Respond in {lang_name}.
For each medicine, explain:
1. What it is for (in simple terms)
2. Exactly when and how to take it
3. Any important warnings or side effects to watch for

Keep your explanation clear, concise, and easy to understand for elderly patients."""

def get_ocr_prompt(language: str) -> str:
    lang_name = LANGUAGE_NAMES.get(language, "English")
    return f"""Analyze this prescription image carefully. Extract all medicine information.

For each medicine found, identify:
- Medicine name
- Dosage (e.g., 500mg, 10ml)
- Timing: morning/afternoon/night (mark as true/false for each)
- Duration (e.g., 7 days)
- Special instructions (e.g., "after food", "with warm water")

Then provide a simple, warm explanation in {lang_name} suitable for an elderly patient.
Explain what each medicine is for, when to take it, and any important warnings.

Format your response as:
---MEDICINES---
[List each medicine with details]
---EXPLANATION---
[Warm, simple explanation in {lang_name}]"""

# ========== API ROUTES ==========

@api_router.get("/")
async def root():
    return {"message": "MediLang Care API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# ===== PRESCRIPTION SCANNING =====

@api_router.post("/scan-prescription")
async def scan_prescription(data: PrescriptionCreate):
    """Scan a prescription image and get AI-powered explanation"""
    try:
        if not EMERGENT_LLM_KEY:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        # Create chat instance for OCR and explanation
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"prescription-{uuid.uuid4()}",
            system_message=get_system_prompt(data.language)
        ).with_model("openai", "gpt-4o")
        
        # Prepare image content
        image_content = ImageContent(image_base64=data.image_base64)
        
        # Send message with image
        user_message = UserMessage(
            text=get_ocr_prompt(data.language),
            image_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        # Parse response to extract medicines and explanation
        medicines = []
        ai_explanation = response
        raw_ocr_text = response
        
        # Try to parse structured response
        if "---MEDICINES---" in response and "---EXPLANATION---" in response:
            parts = response.split("---EXPLANATION---")
            medicine_part = parts[0].replace("---MEDICINES---", "").strip()
            ai_explanation = parts[1].strip() if len(parts) > 1 else response
            raw_ocr_text = medicine_part
            
            # Parse medicines from text (basic parsing)
            medicines = parse_medicines_from_text(medicine_part)
        
        # Create prescription record
        prescription = Prescription(
            user_id=data.user_id,
            raw_ocr_text=raw_ocr_text,
            medicines=medicines,
            ai_explanation=ai_explanation,
            language=data.language,
            image_base64=data.image_base64[:100] + "..." if len(data.image_base64) > 100 else data.image_base64
        )
        
        # Save to database
        await db.prescriptions.insert_one(prescription.dict())
        
        return {
            "success": True,
            "prescription": {
                "id": prescription.id,
                "medicines": [m.dict() for m in medicines],
                "ai_explanation": ai_explanation,
                "language": data.language
            }
        }
        
    except Exception as e:
        logger.error(f"Error scanning prescription: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to scan prescription: {str(e)}")

def parse_medicines_from_text(text: str) -> List[Medicine]:
    """Parse medicine information from OCR text"""
    medicines = []
    lines = text.strip().split("\n")
    
    current_medicine = None
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Look for medicine name patterns
        if line.startswith("-") or line.startswith("•") or line.startswith("*"):
            if current_medicine:
                medicines.append(current_medicine)
            
            name = line.lstrip("-•* ").split(":")[0].split("-")[0].strip()
            current_medicine = Medicine(
                name=name,
                dosage="As prescribed",
                morning=False,
                afternoon=False,
                night=False,
                instructions=""
            )
        elif current_medicine:
            line_lower = line.lower()
            # Check for timing
            if "morning" in line_lower or "सुबह" in line_lower or "காலை" in line_lower:
                current_medicine.morning = True
            if "afternoon" in line_lower or "दोपहर" in line_lower or "மதியம்" in line_lower:
                current_medicine.afternoon = True
            if "night" in line_lower or "रात" in line_lower or "இரவு" in line_lower:
                current_medicine.night = True
            
            # Check for dosage patterns
            import re
            dosage_match = re.search(r'(\d+\s*(?:mg|ml|g|tablet|capsule|drop)s?)', line_lower)
            if dosage_match:
                current_medicine.dosage = dosage_match.group(1)
            
            # Add instructions
            if "after food" in line_lower or "with food" in line_lower or "भोजन" in line_lower or "உணவு" in line_lower:
                current_medicine.instructions += "Take with food. "
    
    if current_medicine:
        medicines.append(current_medicine)
    
    return medicines

# ===== PRESCRIPTIONS CRUD =====

@api_router.get("/prescriptions/{user_id}")
async def get_prescriptions(user_id: str):
    """Get all prescriptions for a user"""
    prescriptions = await db.prescriptions.find({"user_id": user_id}).to_list(100)
    return {"prescriptions": prescriptions}

@api_router.get("/prescription/{prescription_id}")
async def get_prescription(prescription_id: str):
    """Get a specific prescription"""
    prescription = await db.prescriptions.find_one({"id": prescription_id})
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return prescription

# ===== ROUTINE MANAGEMENT =====

@api_router.post("/routines")
async def create_routine(data: RoutineEntryCreate):
    """Add a medicine to daily routine"""
    routine = RoutineEntry(
        user_id=data.user_id,
        medicine_name=data.medicine_name,
        dosage=data.dosage,
        time_slot=data.time_slot,
        instructions=data.instructions,
        end_date=datetime.utcnow() + timedelta(days=data.duration_days)
    )
    await db.routines.insert_one(routine.dict())
    return {"success": True, "routine": routine.dict()}

@api_router.post("/routines/from-prescription")
async def add_prescription_to_routine(prescription_id: str, user_id: str):
    """Add all medicines from a prescription to routine"""
    prescription = await db.prescriptions.find_one({"id": prescription_id})
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    routines_created = []
    medicines = prescription.get("medicines", [])
    
    for med in medicines:
        # Create routine entries for each time slot
        for slot, active in [("morning", med.get("morning", False)), 
                             ("afternoon", med.get("afternoon", False)), 
                             ("night", med.get("night", False))]:
            if active:
                routine = RoutineEntry(
                    user_id=user_id,
                    medicine_name=med.get("name", "Unknown"),
                    dosage=med.get("dosage", "As prescribed"),
                    time_slot=slot,
                    instructions=med.get("instructions", ""),
                    end_date=datetime.utcnow() + timedelta(days=med.get("duration_days", 7))
                )
                await db.routines.insert_one(routine.dict())
                routines_created.append(routine.dict())
    
    return {"success": True, "routines_created": len(routines_created), "routines": routines_created}

@api_router.get("/routines/{user_id}")
async def get_routines(user_id: str):
    """Get all active routines for a user"""
    routines = await db.routines.find({
        "user_id": user_id,
        "is_active": True
    }).to_list(100)
    
    # Group by time slot
    grouped = {
        "morning": [],
        "afternoon": [],
        "night": []
    }
    
    for routine in routines:
        slot = routine.get("time_slot", "morning")
        if slot in grouped:
            grouped[slot].append(serialize_doc(routine))
    
    return {"routines": grouped}

@api_router.delete("/routines/{routine_id}")
async def delete_routine(routine_id: str):
    """Deactivate a routine"""
    result = await db.routines.update_one(
        {"id": routine_id},
        {"$set": {"is_active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Routine not found")
    return {"success": True}

# ===== DOSE LOGGING =====

@api_router.post("/dose-log")
async def log_dose(data: DoseLogCreate):
    """Log a dose as taken or missed"""
    dose_log = DoseLog(
        user_id=data.user_id,
        routine_id=data.routine_id,
        medicine_name=data.medicine_name,
        time_slot=data.time_slot,
        scheduled_date=data.scheduled_date,
        status=data.status,
        taken_at=datetime.utcnow() if data.status == "taken" else None,
        notes=data.notes
    )
    
    # Check if log already exists for this date/slot/medicine
    existing = await db.dose_logs.find_one({
        "user_id": data.user_id,
        "routine_id": data.routine_id,
        "scheduled_date": data.scheduled_date
    })
    
    if existing:
        # Update existing log
        await db.dose_logs.update_one(
            {"id": existing["id"]},
            {"$set": {
                "status": data.status,
                "taken_at": datetime.utcnow() if data.status == "taken" else None,
                "notes": data.notes
            }}
        )
        dose_log.id = existing["id"]
    else:
        await db.dose_logs.insert_one(dose_log.dict())
    
    return {"success": True, "dose_log": dose_log.dict()}

@api_router.get("/dose-logs/{user_id}")
async def get_dose_logs(user_id: str, date: Optional[str] = None):
    """Get dose logs for a user, optionally filtered by date"""
    query = {"user_id": user_id}
    if date:
        query["scheduled_date"] = date
    
    logs = await db.dose_logs.find(query).to_list(500)
    return {"dose_logs": serialize_doc(logs)}

@api_router.get("/dose-logs/{user_id}/stats")
async def get_dose_stats(user_id: str, days: int = 7):
    """Get dose statistics for the past N days"""
    start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    logs = await db.dose_logs.find({
        "user_id": user_id,
        "scheduled_date": {"$gte": start_date}
    }).to_list(500)
    
    total = len(logs)
    taken = len([l for l in logs if l.get("status") == "taken"])
    missed = len([l for l in logs if l.get("status") == "missed"])
    pending = len([l for l in logs if l.get("status") == "pending"])
    
    compliance_rate = (taken / total * 100) if total > 0 else 100
    
    return {
        "total_doses": total,
        "taken": taken,
        "missed": missed,
        "pending": pending,
        "compliance_rate": round(compliance_rate, 1),
        "days": days
    }

# ===== USER MANAGEMENT =====

@api_router.post("/users")
async def create_user(data: UserProfileCreate):
    """Create a new user profile"""
    user = UserProfile(
        name=data.name,
        age=data.age,
        language=data.language
    )
    await db.users.insert_one(user.dict())
    return {"success": True, "user": user.dict()}

@api_router.get("/users/{user_id}")
async def get_user(user_id: str):
    """Get a user profile"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return serialize_doc(user)

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, data: UserProfileUpdate):
    """Update a user profile"""
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = await db.users.find_one({"id": user_id})
    return {"success": True, "user": serialize_doc(user)}

@api_router.get("/users")
async def list_users():
    """List all users (for super user dashboard)"""
    users = await db.users.find().to_list(100)
    return {"users": serialize_doc(users)}

# ===== WEEKLY REPORT =====

@api_router.get("/weekly-report/{user_id}")
async def generate_weekly_report(user_id: str):
    """Generate weekly medication report data"""
    # Get user info
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get last 7 days of logs
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=7)
    
    logs = await db.dose_logs.find({
        "user_id": user_id,
        "scheduled_date": {
            "$gte": start_date.strftime("%Y-%m-%d"),
            "$lte": end_date.strftime("%Y-%m-%d")
        }
    }).to_list(500)
    
    # Get routines for context
    routines = await db.routines.find({"user_id": user_id}).to_list(100)
    
    # Build report data
    report_data = []
    for log in logs:
        report_data.append({
            "date": log.get("scheduled_date"),
            "medicine": log.get("medicine_name"),
            "time_slot": log.get("time_slot"),
            "status": log.get("status"),
            "taken_at": log.get("taken_at").isoformat() if log.get("taken_at") else None,
            "notes": log.get("notes", "")
        })
    
    # Calculate stats
    total = len(logs)
    taken = len([l for l in logs if l.get("status") == "taken"])
    compliance = (taken / total * 100) if total > 0 else 100
    
    return {
        "report": {
            "user_name": user.get("name", "Patient"),
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d"),
            "total_doses": total,
            "doses_taken": taken,
            "compliance_rate": round(compliance, 1),
            "details": report_data
        }
    }

# ===== MISSED DOSE ALERT =====

@api_router.post("/check-missed-doses/{user_id}")
async def check_missed_doses(user_id: str):
    """Check for missed doses and return alert status"""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    current_hour = datetime.utcnow().hour
    
    # Get today's logs
    logs = await db.dose_logs.find({
        "user_id": user_id,
        "scheduled_date": today
    }).to_list(100)
    
    # Get routines
    routines = await db.routines.find({
        "user_id": user_id,
        "is_active": True
    }).to_list(100)
    
    missed_slots = []
    
    # Check morning (by 12 PM)
    if current_hour >= 12:
        morning_routines = [r for r in routines if r.get("time_slot") == "morning"]
        morning_logs = [l for l in logs if l.get("time_slot") == "morning" and l.get("status") == "taken"]
        if len(morning_logs) < len(morning_routines):
            missed_slots.append("morning")
    
    # Check afternoon (by 6 PM)
    if current_hour >= 18:
        afternoon_routines = [r for r in routines if r.get("time_slot") == "afternoon"]
        afternoon_logs = [l for l in logs if l.get("time_slot") == "afternoon" and l.get("status") == "taken"]
        if len(afternoon_logs) < len(afternoon_routines):
            missed_slots.append("afternoon")
    
    # Check night (by 10 PM)
    if current_hour >= 22:
        night_routines = [r for r in routines if r.get("time_slot") == "night"]
        night_logs = [l for l in logs if l.get("time_slot") == "night" and l.get("status") == "taken"]
        if len(night_logs) < len(night_routines):
            missed_slots.append("night")
    
    # Get user info for alert
    user = await db.users.find_one({"id": user_id})
    
    return {
        "missed_slots": missed_slots,
        "should_alert_super_user": len(missed_slots) >= 2,
        "user_name": user.get("name", "Patient") if user else "Patient",
        "super_user_phone": user.get("super_user_phone") if user else None
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
