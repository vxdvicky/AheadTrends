import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from config import get_supabase
from src.features import compute_technical_indicators

def run_predictions_for_all_stocks():
    supabase = get_supabase()
    stocks_res = supabase.table("stocks").select("*").execute()
    
    if not stocks_res.data:
        print("No stocks found.")
        return

    model = joblib.load("models/xgboost_model.pkl")

    for stock in stocks_res.data:
        symbol = stock["symbol"]
        stock_id = stock["id"]

        # 1. Post-Settlement Audit
        unverified = supabase.table("predictions").select("*").eq("stock_id", stock_id).execute()
        for pred in unverified.data:
            pred_id = pred['id']
            target_date = pred['prediction_for_date']
            
            audited = supabase.table("prediction_results").select("*").eq("prediction_id", pred_id).execute()
            if audited.data:
                continue
                
            actual_res = supabase.table("stock_prices").select("*").eq("stock_id", stock_id).eq("date", target_date).execute()
            if actual_res.data:
                prev_res = supabase.table("stock_prices").select("close").eq("stock_id", stock_id).eq("date", pred['prediction_date']).execute()
                if prev_res.data:
                    prev_close = prev_res.data[0]['close']
                    curr_close = actual_res.data[0]['close']
                    
                    actual_dir = "UP" if curr_close > prev_close else "DOWN"
                    is_correct = "CORRECT" if actual_dir == pred['predicted_direction'] else "WRONG"
                    
                    supabase.table("prediction_results").insert({
                        "prediction_id": pred_id,
                        "actual_direction": actual_dir,
                        "actual_return": float((curr_close - prev_close) / prev_close),
                        "result": is_correct
                    }).execute()

        # 2. Prediction Generation
        prices_res = supabase.table("stock_prices").select("*").eq("stock_id", stock_id).order("date").execute()
        df = pd.DataFrame(prices_res.data)
        if df.empty or len(df) < 50:
            continue

        df = compute_technical_indicators(df)
        df.replace([np.inf, -np.inf], np.nan, inplace=True)
        df.dropna(inplace=True)
        
        latest_row = df.iloc[[-1]]
        latest_date = latest_row['date'].values[0]
        
        feature_cols = [
            'return_1d', 'return_3d', 'return_5d', 
            'close_to_sma10', 'rsi_14', 'macd', 
            'volatility_10', 'volume_change'
        ]
        
        pred_val = model.predict(latest_row[feature_cols])[0]
        prob_val = model.predict_proba(latest_row[feature_cols])[0][pred_val]
        
        direction = "UP" if pred_val == 1 else "DOWN"
        
        supabase.table("predictions").upsert({
            "stock_id": stock_id,
            "prediction_date": latest_date,
            "prediction_for_date": datetime.now().strftime('%Y-%m-%d'),
            "predicted_direction": direction,
            "probability": float(prob_val),
            "model_version": "RandomForest_v1"
        }, on_conflict="stock_id, prediction_date").execute()
        
        print(f"Generated Prediction for {symbol}: Direction={direction}, Confidence={prob_val:.2%}")

if __name__ == "__main__":
    run_predictions_for_all_stocks()