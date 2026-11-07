from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import pandas as pd
import numpy as np
from config import get_supabase
from src.features import compute_technical_indicators

app = FastAPI(title="AheadTrends Stock AI Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase = get_supabase()

@app.get("/api/stocks")
def get_stocks():
    res = supabase.table("stocks").select("*").execute()
    return res.data

@app.get("/api/stock/{symbol}")
def get_stock_data(
    symbol: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    stock_res = supabase.table("stocks").select("id").eq("symbol",symbol).execute()
    if not stock_res.data:
        return {"error": "Stock not found"}
    
    stock_id = stock_res.data[0]["id"]
    
    # Prices Load & Features Compute
    prices_res = supabase.table("stock_prices").select("*").eq("stock_id", stock_id).order("date").execute()
    prices_df = pd.DataFrame(prices_res.data)
    
    if not prices_df.empty:
        prices_df = compute_technical_indicators(prices_df)
        prices_df.replace([np.inf, -np.inf], np.nan, inplace=True)
        prices_df = prices_df.fillna(0)
    
    # Latest Prediction
    pred_res = supabase.table("predictions").select("*").eq("stock_id", stock_id).order("created_at", desc=True).limit(1).execute()
    
    # Audit Logs with Date Range Filtering
    audit_query = supabase.table("predictions").select(
        "prediction_date, predicted_direction, probability, prediction_results(actual_direction, result)"
    ).eq("stock_id", stock_id).order("created_at", desc=True)

    if start_date:
        audit_query = audit_query.gte("prediction_date", start_date)
    if end_date:
        audit_query = audit_query.lte("prediction_date", end_date)

    audit_res = audit_query.execute()

    return {
        "prices": prices_df.to_dict(orient="records") if not prices_df.empty else [],
        "latest_prediction": pred_res.data[0] if pred_res.data else None,
        "audit_logs": audit_res.data if audit_res.data else []
    }