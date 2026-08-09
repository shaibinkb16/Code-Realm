import logging
import json
import sys
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "func_name": record.funcName,
            "line": record.lineno
        }
        if hasattr(record, "request_id"):
            log_data["request_id"] = getattr(record, "request_id")
        if hasattr(record, "user_id"):
            log_data["user_id"] = getattr(record, "user_id")
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data)

def setup_logging():
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    
    # Remove default handlers to prevent duplicate output
    logger.handlers = [handler]
    return logger

logger = setup_logging()
