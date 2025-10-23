from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

def get_engine():
    return create_engine(os.getenv("DATABASE_URL"))

Base = declarative_base()
