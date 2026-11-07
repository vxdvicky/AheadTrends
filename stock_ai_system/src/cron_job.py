import sys
import os

# Ensure root directory is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import yfinance as yf
from sklearn.ensemble import RandomForestClassifier
from config import get_supabase
from src.features import compute_technical_indicators

supabase = get_supabase()

def cleanup_old_database_records():
    """
    Keeps Supabase free database lightweight by purging old price and prediction records.
    """
    print("🧹 Running Automatic Database Storage Cleanup...")
    try:
        price_cutoff = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
        prediction_cutoff = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')
        
        supabase.table("stock_prices").delete().lt("date", price_cutoff).execute()
        supabase.table("predictions").delete().lt("prediction_date", prediction_cutoff).execute()
        
        print(f"✅ Storage Cleaned! Removed prices before {price_cutoff} and predictions before {prediction_cutoff}.")
    except Exception as e:
        print(f"⚠️ Storage cleanup warning: {e}")

def run_daily_pipeline():
    print(f"[{datetime.now()}] Starting Automated Daily Stock Ingestion & Retraining Engine...")
    
    cleanup_old_database_records()
    
    stocks_res = supabase.table("stocks").select("*").execute()
    stocks = stocks_res.data

    for stock in stocks:
        symbol = stock["symbol"]
        stock_id = stock["id"]
        print(f"🔄 Processing Stock: {symbol}")

        df = yf.download(symbol, period="1y", interval="1d", progress=False)
        if df.empty:
            continue
            
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [col[0] for col in df.columns]

        df = df.reset_index()
        df = df.rename(columns={
            "Date": "date", "Open": "open", "High": "high",
            "Low": "low", "Close": "close", "Volume": "volume"
        })
        
        df = df.ffill().bfill().fillna(0)
        df["date"] = pd.to_datetime(df["date"]).dt.strftime('%Y-%m-%d')
        
        for _, row in df.tail(10).iterrows():
            supabase.table("stock_prices").upsert({
                "stock_id": stock_id,
                "date": str(row["date"]),
                "open": float(row["open"]),
                "high": float(row["high"]),
                "low": float(row["low"]),
                "close": float(row["close"]),
                "volume": int(row["volume"])
            }, on_conflict="stock_id, date").execute()

        # Compute Technical Features
        df = compute_technical_indicators(df)
        df.replace([np.inf, -np.inf], np.nan, inplace=True)
        df = df.fillna(0)

        df['target'] = (df['close'].shift(-1) > df['close']).astype(int)
        train_df = df.iloc[:-1].dropna()
        
        feature_cols = [c for c in train_df.columns if c not in ['date', 'open', 'high', 'low', 'close', 'volume', 'target']]
        
        X = train_df[feature_cols]
        y = train_df['target']
        
        model = RandomForestClassifier(n_estimators=100, random_state=42)
        model.fit(X, y)
        
        latest_features = df[feature_cols].iloc[[-1]]
        prob = model.predict_proba(latest_features)[0][1]
        predicted_dir = "UP" if prob >= 0.5 else "DOWN"
        next_pred_date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')

        # Insert/Upsert payload matching Supabase column constraints
        pred_payload = {
            "stock_id": stock_id,
            "prediction_date": next_pred_date,
            "prediction_for_date": next_pred_date,
            "predicted_direction": predicted_dir,
            "probability": float(prob),
            "model_version": "Rolling_RandomForest_v2"
        }

        try:
            supabase.table("predictions").insert(pred_payload).execute()
        except Exception as insert_err:
            # Fallback if constraint requires date update
            supabase.table("predictions").upsert(pred_payload, on_conflict="stock_id, prediction_date").execute()

    print("🚀 Auto-Retrain & Prediction Engine Completed Successfully!")

if __name__ == "__main__":
    run_daily_pipeline()