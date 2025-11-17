"""Central logging configuration for the FastAPI application."""

from __future__ import annotations

import logging
import logging.config
from typing import Any, Dict

from settings import Settings


def build_logging_config(settings: Settings) -> Dict[str, Any]:
    """Return a dictConfig that emits structured logs."""

    formatter_name = "json" if settings.log_json else "plain"
    formatters = {
        "plain": {
            "format": "%(asctime)s %(levelname)s %(name)s %(message)s",
        },
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "fmt": "%(asctime)s %(levelname)s %(name)s %(message)s",
        },
    }

    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": formatters,
        "handlers": {
            "default": {
                "class": "logging.StreamHandler",
                "formatter": formatter_name,
            }
        },
        "root": {
            "level": settings.log_level.upper(),
            "handlers": ["default"],
        },
    }


def configure_logging(settings: Settings) -> None:
    """Apply the logging configuration for the app."""

    config = build_logging_config(settings)
    logging.config.dictConfig(config)
    logging.getLogger(__name__).debug("Logging configured", extra={"config": config})
