from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os
import shutil
import pytesseract
from PIL import Image
import re

from database import engine, get_db, Base
from models import User, Expense, ExpenseSplit, Settlement

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Budget Tracker")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure receipts directory exists
os.makedirs("receipts", exist_ok=True)

# --- Pydantic Models ---

class UserCreate(BaseModel):
    name: str

class ExpenseCreate(BaseModel):
    amount: float
    description: str
    category: str = "other"
    paid_by: int
    split_with: List[int] = []  # user IDs to split with (equal split)

class SettlementCreate(BaseModel):
    from_user: int
    to_user: int
    amount: float

class ExpenseResponse(BaseModel):
    id: int
    amount: float
    description: str
    category: str
    paid_by: int
    paid_by_name: str
    created_at: datetime
    splits: List[dict]

# --- Routes ---

@app.get("/")
def root():
    return {"status": "Budget Tracker API running"}

# Users
@app.post("/users")
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.name == user.name).first()
    if existing:
        return existing
    db_user = User(name=user.name)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/users")
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()

# Expenses
@app.post("/expenses")
def create_expense(expense: ExpenseCreate, db: Session = Depends(get_db)):
    db_expense = Expense(
        amount=expense.amount,
        description=expense.description,
        category=expense.category,
        paid_by=expense.paid_by,
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)

    # Create splits if specified
    if expense.split_with:
        all_users = [expense.paid_by] + expense.split_with
        share = expense.amount / len(all_users)
        for user_id in expense.split_with:
            split = ExpenseSplit(
                expense_id=db_expense.id,
                user_id=user_id,
                share=share
            )
            db.add(split)
        db.commit()

    return db_expense

@app.get("/expenses")
def get_expenses(db: Session = Depends(get_db)):
    expenses = db.query(Expense).order_by(Expense.created_at.desc()).all()
    result = []
    for exp in expenses:
        user = db.query(User).filter(User.id == exp.paid_by).first()
        splits = db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == exp.id).all()
        result.append({
            "id": exp.id,
            "amount": exp.amount,
            "description": exp.description,
            "category": exp.category,
            "paid_by": exp.paid_by,
            "paid_by_name": user.name if user else "Unknown",
            "created_at": exp.created_at,
            "splits": [{"user_id": s.user_id, "share": s.share, "settled": s.settled} for s in splits]
        })
    return result

# Receipt upload with OCR
@app.post("/expenses/receipt")
async def create_expense_from_receipt(
    file: UploadFile = File(...),
    paid_by: int = Form(...),
    split_with: str = Form(""),  # comma-separated user IDs
    category: str = Form("other"),
    db: Session = Depends(get_db)
):
    # Save file
    filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
    filepath = f"receipts/{filename}"
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # OCR to extract amount
    try:
        image = Image.open(filepath)
        text = pytesseract.image_to_string(image)

        # Try to find total amount (common patterns)
        patterns = [
            r'total[:\s]*\$?(\d+\.?\d*)',
            r'amount[:\s]*\$?(\d+\.?\d*)',
            r'grand total[:\s]*\$?(\d+\.?\d*)',
            r'\$(\d+\.\d{2})\s*$',  # Last dollar amount
        ]

        amount = None
        for pattern in patterns:
            match = re.search(pattern, text.lower())
            if match:
                amount = float(match.group(1))
                break

        if not amount:
            # Fallback: find largest dollar amount
            amounts = re.findall(r'\$?(\d+\.\d{2})', text)
            if amounts:
                amount = max(float(a) for a in amounts)
    except Exception as e:
        return {"error": f"OCR failed: {str(e)}", "filepath": filepath}

    if not amount:
        return {"error": "Could not extract amount from receipt", "filepath": filepath, "ocr_text": text[:500]}

    # Create expense
    db_expense = Expense(
        amount=amount,
        description=f"Receipt: {file.filename}",
        category=category,
        paid_by=paid_by,
        receipt_path=filepath
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)

    # Handle splits
    if split_with:
        split_ids = [int(x) for x in split_with.split(",") if x]
        all_users = [paid_by] + split_ids
        share = amount / len(all_users)
        for user_id in split_ids:
            split = ExpenseSplit(expense_id=db_expense.id, user_id=user_id, share=share)
            db.add(split)
        db.commit()

    return {"expense_id": db_expense.id, "amount": amount, "filepath": filepath}

# Balance calculation
@app.get("/balance")
def get_balance(db: Session = Depends(get_db)):
    """Calculate who owes whom"""
    users = db.query(User).all()
    balances = {}

    for user in users:
        balances[user.id] = {"name": user.name, "owes": {}, "owed": {}}

    # Calculate from unsettled splits
    splits = db.query(ExpenseSplit).filter(ExpenseSplit.settled == False).all()
    for split in splits:
        expense = db.query(Expense).filter(Expense.id == split.expense_id).first()
        if expense and expense.paid_by != split.user_id:
            # split.user_id owes expense.paid_by the share amount
            payer = expense.paid_by
            debtor = split.user_id

            if payer not in balances[debtor]["owes"]:
                balances[debtor]["owes"][payer] = 0
            balances[debtor]["owes"][payer] += split.share

            if debtor not in balances[payer]["owed"]:
                balances[payer]["owed"][debtor] = 0
            balances[payer]["owed"][debtor] += split.share

    # Factor in settlements
    settlements = db.query(Settlement).all()
    for s in settlements:
        if s.to_user in balances[s.from_user]["owes"]:
            balances[s.from_user]["owes"][s.to_user] -= s.amount
        if s.from_user in balances[s.to_user]["owed"]:
            balances[s.to_user]["owed"][s.from_user] -= s.amount

    # Simplify: net balances between each pair
    simplified = {}
    for user_id, data in balances.items():
        net = 0
        for owed_to, amount in data["owes"].items():
            net -= amount
        for owed_by, amount in data["owed"].items():
            net += amount
        simplified[user_id] = {"name": data["name"], "net": round(net, 2)}

    return {"detailed": balances, "simplified": simplified}

# Settle up
@app.post("/settle")
def settle_up(settlement: SettlementCreate, db: Session = Depends(get_db)):
    db_settlement = Settlement(
        from_user=settlement.from_user,
        to_user=settlement.to_user,
        amount=settlement.amount
    )
    db.add(db_settlement)
    db.commit()
    return {"status": "settled", "amount": settlement.amount}

# Stats
@app.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total = db.query(func.sum(Expense.amount)).scalar() or 0
    by_category = db.query(
        Expense.category,
        func.sum(Expense.amount)
    ).group_by(Expense.category).all()

    by_user = db.query(
        User.name,
        func.sum(Expense.amount)
    ).join(Expense, User.id == Expense.paid_by).group_by(User.name).all()

    return {
        "total": total,
        "by_category": {cat: amt for cat, amt in by_category},
        "by_user": {name: amt for name, amt in by_user}
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
