import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from config import get_supabase
from src.features import compute_technical_indicators

st.set_page_config(page_title="AI Stock Analytics", layout="wide")

st.title("📈 AI-Based Daily Stock Market Prediction & Analytics System")
st.markdown("Automated Daily Stock Price Prediction & Performance Auditing Platform")

supabase = get_supabase()

# Stock Selector
stocks_res = supabase.table("stocks").select("*").execute()
stocks_df = pd.DataFrame(stocks_res.data)

if not stocks_df.empty:
    selected_symbol = st.sidebar.selectbox("Select Stock Ticker", stocks_df['symbol'].tolist())
    stock_id = stocks_df[stocks_df['symbol'] == selected_symbol]['id'].values[0]

    # Load Prices
    prices_res = supabase.table("stock_prices").select("*").eq("stock_id", stock_id).order("date").execute()
    df = pd.DataFrame(prices_res.data)

    if not df.empty:
        df = compute_technical_indicators(df)
        
        # Display Prediction Summary
        pred_res = supabase.table("predictions").select("*").eq("stock_id", stock_id).order("created_at", desc=True).limit(1).execute()
        
        col1, col2, col3, col4 = st.columns(4)
        latest_close = df.iloc[-1]['close']
        col1.metric("Latest Closing Price", f"₹{latest_close:.2f}")

        if pred_res.data:
            latest_pred = pred_res.data[0]
            col2.metric("Predicted Direction", latest_pred['predicted_direction'])
            col3.metric("Model Confidence", f"{latest_pred['probability']:.1%}")
            col4.metric("Prediction Date", latest_pred['prediction_date'])

        # Stock Price Chart
        st.subheader(f"Price History & Technical Moving Averages ({selected_symbol})")
        fig = go.Figure()
        fig.add_trace(go.Scatter(x=df['date'], y=df['close'], mode='lines', name='Close Price'))
        fig.add_trace(go.Scatter(x=df['date'], y=df['sma_20'], mode='lines', name='SMA 20'))
        fig.add_trace(go.Scatter(x=df['date'], y=df['sma_50'], mode='lines', name='SMA 50'))
        st.plotly_chart(fig, use_container_width=True)

        # Audit Table
        st.subheader("📋 Predictions Audit History")
        audit_res = supabase.table("predictions").select("prediction_date, predicted_direction, probability, prediction_results(actual_direction, result)").eq("stock_id", stock_id).execute()
        if audit_res.data:
            st.dataframe(pd.DataFrame(audit_res.data))