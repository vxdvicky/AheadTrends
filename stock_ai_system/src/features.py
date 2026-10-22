import pandas as pd
import numpy as np

def compute_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy().sort_values("date")
    
    # 1. Price Returns & Lags
    df['return_1d'] = df['close'].pct_change(1)
    df['return_3d'] = df['close'].pct_change(3)
    df['return_5d'] = df['close'].pct_change(5)
    
    # 2. Moving Averages & Ratio
    df['sma_10'] = df['close'].rolling(window=10).mean()
    df['sma_20'] = df['close'].rolling(window=20).mean()
    df['close_to_sma10'] = df['close'] / (df['sma_10'] + 1e-9)
    
    # 3. RSI (14)
    delta = df['close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / (loss + 1e-9)
    df['rsi_14'] = 100 - (100 / (1 + rs))

    # 4. MACD & Volatility
    ema_12 = df['close'].ewm(span=12, adjust=False).mean()
    ema_26 = df['close'].ewm(span=26, adjust=False).mean()
    df['macd'] = ema_12 - ema_26
    df['volatility_10'] = df['return_1d'].rolling(window=10).std()
    df['volume_change'] = df['volume'].pct_change()

    # Target: Next day return positive hai ya nahi (1=UP, 0=DOWN)
    df['target'] = (df['close'].shift(-1) > df['close']).astype(int)

    # Infinite values ko NaN mein convert karke drop karo
    df.replace([np.inf, -np.inf], np.nan, inplace=True)

    return df