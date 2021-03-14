import os

import simplejson as json

from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker

from ticker_score_calculation import TickerScoreCalculation
import pandas as pd

from yahoo import yfinance_data
from cachetools import cached, TTLCache
from flask import request
import datetime

app = Flask(__name__,
            static_url_path='',
            static_folder='../frontend/build',)
CORS(app)


def get_settings_value(key, default=None):
    with open('settings.json', 'r') as f:
        return json.load(f).get(key, default)


def df_to_json(df):
    first = df.index[0]

    if str(df.index.dtype).startswith('datetime'):
        idx = df.index.to_pydatetime()
    else:
        idx = df.index

    return {
        "idx": list(idx),
        "values": {k: list(v) for (k, v) in df.transpose().iterrows()}
    }


def calculate_position_delta(l1: list, l2: list):
    def get_position_delta(x, pos1):
        try:
            pos2 = l2.index(x) + 1
        except ValueError:
            pos2 = None
        return {"positionNow": pos1, "positionOld": pos2, "positionDelta": pos2 - pos1 if pos2 is not None else None}

    return {x: get_position_delta(x, i + 1) for (i, x) in enumerate(l1)}


def calculate_cached():
    score = TickerScoreCalculation(ignore_tickers=get_settings_value("blacklist", []))
    now = datetime.datetime.utcnow()

    cumsum_3d = score.ticker_score_df_rel.loc[score.ticker_score_df_rel.index >= (now - datetime.timedelta(days=3)),
                :].cumsum()

    sorted = cumsum_3d.iloc[-1].sort_values(ascending=False)
    index_1d_ago = list(
        score.ticker_score_df_rel.loc[
        (score.ticker_score_df_rel.index >= (now - datetime.timedelta(days=4))) &
        (score.ticker_score_df_rel.index <= (now - datetime.timedelta(days=1))), :].cumsum().iloc[-1].sort_values(
            ascending=False)
            .index)

    def get_top_n_tickers(n):
        ts = set(sorted.head(n).index) \
            .union(set(get_settings_value("tickerClassifications", {}).keys()))
        ts = ts.intersection(sorted.index)
        return ts

    top_tickers = get_top_n_tickers(10)
    top_tickers_summary = get_top_n_tickers(30)

    summary = pd.DataFrame(
        {'absolute': score.ticker_score_df_abs.loc[:, top_tickers_summary].iloc[-1],
         'cumsum1d': score.ticker_score_df_rel.loc[
             score.ticker_score_df_rel.index >= (now - datetime.timedelta(days=1)), top_tickers_summary].cumsum().iloc[
             -1],
         'cumsum3d': score.ticker_score_df_rel.loc[
             score.ticker_score_df_rel.index >= (now - datetime.timedelta(days=3)), top_tickers_summary].cumsum().iloc[
             -1],
         'cumsum7d': score.ticker_score_df_rel.loc[
             score.ticker_score_df_rel.index >= (now - datetime.timedelta(days=7)), top_tickers_summary].cumsum().iloc[
             -1],
         'positionDelta': pd.Series(calculate_position_delta(list(sorted.index), index_1d_ago)).loc[top_tickers_summary]
        }
    )

    return jsonify({
        'tickersPosts': {k: list(v) for k, v in score.tickers_posts.items()},
        'tickerScoreSummary': df_to_json(summary),
        'tickerScoreRel': df_to_json(score.ticker_score_df_rel.loc[:, top_tickers]),
        'tickerScoreSum': df_to_json(score.ticker_score_df_rel.loc[:, top_tickers].cumsum()),
        'posts': score.posts_by_id
    })


@app.route("/scores")
def calculate():
    return calculate_cached()

@cached(cache=TTLCache(maxsize=1024, ttl=20 * 60 * 60))
def yfinance_data_cached(ticker):
    return yfinance_data(ticker)


@app.route("/yahoo/<ticker>")
def yahoo(ticker):
    history_month, history_week, info, summary = yfinance_data_cached(ticker)
    return jsonify({
        "historyMonth": df_to_json(history_month),
        "historyWeek": df_to_json(history_week),
        "info": info,
        "summary": summary
    })


@app.route("/settings/<key>", methods=['GET', 'PUT'])
def settings(key):
    if request.method == "PUT":
        # TODO: make operation atomic
        with open('settings.json', 'r+') as f:
            dict = json.load(f)
        with open('settings.json', 'w') as f:
            json.dump(dict | {key: request.json}, f)
        return '', 204
    else:
        return jsonify(get_settings_value(key))

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    return app.send_static_file("index.html")


if __name__ == '__main__':
    import sys
    sys.path.append('..')
    app.run(host='0.0.0.0')
