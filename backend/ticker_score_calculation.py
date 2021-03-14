import re
import json
import datetime

import pandas as pd
from sqlalchemy import create_engine, asc
from sqlalchemy.orm import sessionmaker, scoped_session

from models import Posts

engine = create_engine('sqlite:///data.db', convert_unicode=True, connect_args={'check_same_thread': False}) # check = false safe, because readonly
db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
db = db_session()

with open('tickers.json') as f:
    ticker_list = set([x.upper() for x in json.load(f).keys()])

ticker_extract_regex = r"[$][A-Za-z]{2,5}|[A-Z]{3,5}"
ticker_blacklist = ['NGL', 'ONE', 'DD', 'HODL', 'NEW', 'RH', 'MOON', 'ARE', 'FOR', 'HUGE', 'INFO', 'CBD', 'BIO', 'CEO',
                    'PLAY', 'FLY']


def calc_posts_score_df(posts: Posts):
    df = pd.DataFrame(posts.posts, columns=['id', 'score', 'upvoteRatio'])
    df['myscore'] = df['score']  # * df['upvoteRatio']
    df = df.set_index('id')
    df = df['myscore']
    df = df.rename(posts.date)
    return df


def get_tickers_for_post(post):
    assigned_tickers = set()
    for ticker in [x.replace("$", "").strip().upper() for x in re.findall(ticker_extract_regex, post['title'])]:
        if ticker not in ticker_blacklist and ticker in ticker_list:
            assigned_tickers.add(ticker)
    return assigned_tickers


class TickerScoreCalculation:
    def __init__(self, query=db.query(Posts).where(Posts.date >= (datetime.date.today() - datetime.timedelta(days=7))).order_by(asc(Posts.date)), ignore_tickers=[]):
        self.posts_score_df = pd.DataFrame()
        self.posts_by_id = {}
        self.tickers_posts = {}
        self.posts_tickers = {}

        for posts_row in query:
            self.posts_score_df = pd.DataFrame.join(self.posts_score_df, calc_posts_score_df(posts_row), how='outer')

            for post in posts_row.posts:
                if not post['id'] in self.posts_tickers:
                    tickers = get_tickers_for_post(post).difference(ignore_tickers)
                    if len(tickers) == 0:
                        continue  # uninteresting posts

                    self.posts_tickers[post['id']] = get_tickers_for_post(post)

                if not post['id'] in self.posts_by_id:
                    self.posts_by_id[post['id']] = post

                    for ticker in self.posts_tickers[post['id']]:
                        if not ticker in self.tickers_posts:
                            self.tickers_posts[ticker] = set()
                        self.tickers_posts[ticker].add(post['id'])
                else:
                    self.posts_by_id[post['id']] = post # still overwrite to get latest version

        for (post_id, tickers) in self.posts_tickers.items():
            self.posts_score_df.loc[post_id, :] /= len(tickers)

        self.posts_score_df_abs = self.posts_score_df
        self.posts_score_df_rel = self.posts_score_df.transpose().fillna(method='ffill').fillna(
            method='bfill').diff().transpose()

        self.ticker_score_df_abs = pd.DataFrame()
        self.ticker_score_df_rel = pd.DataFrame()
        for (ticker, posts) in self.tickers_posts.items():
            self.ticker_score_df_rel[ticker] = self.posts_score_df_rel.loc[posts, :].sum(0)
            self.ticker_score_df_abs[ticker] = self.posts_score_df_abs.loc[posts, :].sum(0)

# calculate hype by comparing difference in score by post

# from pandasgui import show
# show(pd.DataFrame(scores.items()))
# print(df)
