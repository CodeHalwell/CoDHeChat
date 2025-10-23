import os
from alembic.config import Config
from alembic import command

def run_migrations():
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])
    command.upgrade(alembic_cfg, "head")

if __name__ == "__main__":
    run_migrations()
