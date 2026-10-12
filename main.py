from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List

app = FastAPI()

# データの型定義
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

# メモリ上の仮データベース（のちに本格的なDBに繋げられます）
fake_db = []

@app.get("/api/transactions")
def get_transactions():
    return fake_db

@app.post("/api/transactions")
def create_transaction(transaction: Transaction):
    fake_db.append(transaction.dict())
    return {"status": "success", "data": transaction}

# ルートアクセス時に index.html を返す
@app.get("/")
def read_index():
    return FileResponse("index.html")

# CSSやJS、画像などの静的ファイルを同じディレクトリから読み込めるようにする
app.mount("/", StaticFiles(directory="."), name="static")