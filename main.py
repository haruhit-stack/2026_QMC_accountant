from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List

app = FastAPI()

class Item(BaseModel):
    name: str
    price: int
    quantity: int

class Transaction(BaseModel):
    id: str
    timestamp: str
    amount: int
    received: int
    change: int
    items: List[Item]

# 仮のデータベース
fake_db = []

@app.get("/api/transactions")
def get_transactions():
    return fake_db

@app.post("/api/transactions")
def create_transaction(transaction: Transaction):
    fake_db.append(transaction.dict())
    return {"status": "success", "data": transaction}

# 1件削除用のAPI
@app.delete("/api/transactions/{transaction_id}")
def delete_transaction(transaction_id: str):
    global fake_db
    initial_length = len(fake_db)
    fake_db = [t for t in fake_db if t["id"] != transaction_id]
    if len(fake_db) == initial_length:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"status": "success"}

# 全削除用のAPI
@app.delete("/api/transactions")
def clear_all_transactions():
    global fake_db
    fake_db = []
    return {"status": "success"}

@app.get("/")
def read_index():
    return FileResponse("index.html")

app.mount("/", StaticFiles(directory="."), name="static")