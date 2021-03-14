import praw
from datetime import datetime, date, timedelta

from tqdm import tqdm
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session

from models import mapper_registry, Posts

subreddits_to_load = ["robinhoodpennystocks", "pennystocks"]


engine = create_engine('sqlite:///data.db', convert_unicode=True)
db_session = scoped_session(sessionmaker(autocommit=False,
                                         autoflush=False,
                                         bind=engine))


def load_data(subreddits, count):
    reddit = praw.Reddit('ClientSecrets')
    posts_query = reddit.subreddit(subreddits).top(limit=count, time_filter="week")

    posts = [{
        "subreddit": post.subreddit_name_prefixed,
        "flair": post.link_flair_text,
        "author": '[deleted]' if post.author is None else post.author.name,
        "date": datetime.utcfromtimestamp(post.created_utc).isoformat(),
        "id": post.id,
        "title": post.title,
        "score": post.score,
        "commentCount": post.num_comments,
        "upvoteRatio": post.upvote_ratio} for post in tqdm(posts_query, desc="Querying Reddit API", total=count)]
    queried_at = datetime.utcnow()

    p = Posts(subreddits, date=queried_at, posts=posts)
    db_session.add(p)
    db_session.commit()

    print("Successfully loaded data")

if __name__ == '__main__':
    mapper_registry.metadata.create_all(bind=engine)
    load_data("+".join(subreddits_to_load), count=100)
    
    print("Cleaning up old data")
    db_session.query(Posts).where(Posts.date < (date.today() - timedelta(days=7))).delete()