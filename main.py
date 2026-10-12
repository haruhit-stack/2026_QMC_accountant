import os
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List
from sqlalchemy import create_engine, Column, String, Integer, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import json

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
    elif DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# SQLAlchemyの設定
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# データベースのテーブル定義
class TransactionModel(Base):
    __tablename__ = "transactions"
    id = Column(String, primary_key=True, index=True)
    timestamp = Column(String)
    amount = Column(Integer)
    received = Column(Integer)
    change = Column(Integer)
    items_json = Column(Text)

# テーブルを自動作成
Base.metadata.create_all(bind=engine)

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

# データベースセッションを取得するヘルパー
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/api/transactions")
def get_transactions():
    db = SessionLocal()
    try:
        db_transactions = db.query(TransactionModel).all()
        result = []
        for t in db_transactions:
            result.append({
                "id": t.id,
                "timestamp": t.timestamp,
                "amount": t.amount,
                "received": t.received,
                "change": t.change,
                "items": json.loads(t.items_json) if t.items_json else []
            })
        return result
    finally:
        db.close()

@app.post("/api/transactions")
def create_transaction(transaction: Transaction):
    db = SessionLocal()
    try:
        # すでに同じIDが存在するか確認
        existing = db.query(TransactionModel).filter(TransactionModel.id == transaction.id).first()
        if existing:
            return {"status": "exists", "data": transaction}
        
        db_item = TransactionModel(
            id=transaction.id,
            timestamp=transaction.timestamp,
            amount=transaction.amount,
            received=transaction.received,
            change=transaction.change,
            items_json=json.dumps([i.dict() for i in transaction.items], ensure_ascii=False)
        )
        db.add(db_item)
        db.commit()
        return {"status": "success", "data": transaction}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.delete("/api/transactions/{transaction_id}")
def delete_transaction(transaction_id: str):
    db = SessionLocal()
    try:
        db_item = db.query(TransactionModel).filter(TransactionModel.id == transaction_id).first()
        if not db_item:
            raise HTTPException(status_code=404, detail="Transaction not found")
        db.delete(db_item)
        db.commit()
        return {"status": "success"}
    finally:
        db.close()

@app.delete("/api/transactions")
def clear_all_transactions():
    db = SessionLocal()
    try:
        db.query(TransactionModel).delete()
        db.commit()
        return {"status": "success"}
    finally:
        db.close()

@app.get("/")
def read_index():
    return FileResponse("index.html")

app.mount("/", StaticFiles(directory="."), name="static")