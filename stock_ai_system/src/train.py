import os
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from config import get_supabase
from src.features import compute_technical_indicators

def train_and_save_model(symbol="RELIANCE.NS"):
    supabase = get_supabase()
    
    res = supabase.table("stocks").select("id").eq("symbol", symbol).execute()
    if not res.data:
        print(f"Stock {symbol} nahi mila.")
        return
    stock_id = res.data[0]["id"]
    
    price_res = supabase.table("stock_prices").select("*").eq("stock_id", stock_id).order("date").execute()
    df = pd.DataFrame(price_res.data)

    df = compute_technical_indicators(df)
    
    # Extra check for infinite and null values
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    df.dropna(inplace=True)

    feature_cols = [
        'return_1d', 'return_3d', 'return_5d', 
        'close_to_sma10', 'rsi_14', 'macd', 
        'volatility_10', 'volume_change'
    ]
    
    split_idx = int(len(df) * 0.8)
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]

    X_train, y_train = train_df[feature_cols], train_df['target']
    X_test, y_test = test_df[feature_cols], test_df['target']

    # Model Training
    model = RandomForestClassifier(n_estimators=150, max_depth=4, random_state=42)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    print(f"--- Updated Model Performance ({symbol}) ---")
    print(f"Accuracy:  {accuracy_score(y_test, preds):.2%}")
    print(f"Precision: {precision_score(y_test, preds):.2%}")
    print(f"Recall:    {recall_score(y_test, preds):.2%}")
    print(f"F1-Score:  {f1_score(y_test, preds):.2%}")

    os.makedirs("models", exist_ok=True)
    joblib.dump(model, "models/xgboost_model.pkl")
    print("Model trained and saved successfully without errors!")

if __name__ == "__main__":
    train_and_save_model()