import pandas as pd
import yfinance as yf
from config import get_supabase

def sync_all_stocks(period="2y"):
    supabase = get_supabase()
    
    # Supabase se saare stocks retrieve karein
    stocks_res = supabase.table("stocks").select("*").execute()
    if not stocks_res.data:
        print("Database mein koi stock nahi mila.")
        return

    for stock in stocks_res.data:
        symbol = stock["symbol"]
        stock_id = stock["id"]

        print(f"Fetching data for {symbol}...")
        df = yf.download(symbol, period=period, interval="1d")
        
        if df.empty:
            continue
        
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        df.reset_index(inplace=True)

        records = []
        for _, row in df.iterrows():
            records.append({
                "stock_id": stock_id,
                "date": row['Date'].strftime('%Y-%m-%d'),
                "open": float(row['Open']),
                "high": float(row['High']),
                "low": float(row['Low']),
                "close": float(row['Close']),
                "volume": int(row['Volume'])
            })

        supabase.table("stock_prices").upsert(records, on_conflict="stock_id, date").execute()
        print(f"Successfully synced {len(records)} records for {symbol}!")

if __name__ == "__main__":
    sync_all_stocks()