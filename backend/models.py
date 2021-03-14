from dataclasses import dataclass, field
from datetime import datetime
from typing import List
from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.orm import registry

mapper_registry = registry()

@mapper_registry.mapped
@dataclass
class Posts:
    __tablename__ = 'reddit_posts'
    __sa_dataclass_metadata_key__ = "sa"

    id: int = field(
        init=False, metadata={"sa": Column(Integer, primary_key=True)}
    )
    subreddits: str = field(default=None, metadata={"sa": Column(String)})
    date: datetime = field(default=None, metadata={"sa": Column(DateTime)})
    posts: List[dict] = field(default_factory=[], metadata={"sa": Column(JSON)})
