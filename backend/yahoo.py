import yfinance as yf

def yfinance_data(ticker):
    ticker = yf.Ticker(ticker)
    history_month = ticker.history(period="1mo", interval="1d")
    history_week = ticker.history(period="5d", interval="60m", prepost=True)
    info = ticker.info

    close_prices = history_week.Close

    return history_month, history_week, info, {
        "last": close_prices[len(close_prices)-1]
    }