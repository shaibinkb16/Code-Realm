from fastapi import HTTPException, status, Request
from fastapi.responses import JSONResponse
from app.core.logging import logger

class CodeRealmException(Exception):
    def __init__(self, message: str, code: str = "INTERNAL_ERROR", status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)

class AuthenticationError(CodeRealmException):
    def __init__(self, message: str = "Invalid credentials"):
        super().__init__(message, code="UNAUTHENTICATED", status_code=status.HTTP_401_UNAUTHORIZED)

class AuthorizationError(CodeRealmException):
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message, code="FORBIDDEN", status_code=status.HTTP_403_FORBIDDEN)

class NotFoundError(CodeRealmException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, code="NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)

class RateLimitError(CodeRealmException):
    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(message, code="RATE_LIMIT_EXCEEDED", status_code=status.HTTP_429_TOO_MANY_REQUESTS)

class ValidationError(CodeRealmException):
    def __init__(self, message: str = "Validation failed"):
        super().__init__(message, code="VALIDATION_ERROR", status_code=status.HTTP_400_BAD_REQUEST)

async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, CodeRealmException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "path": request.url.path
                }
            }
        )
    
    logger.error(f"Unhandled Exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_SERVER_ERROR", "message": str(exc), "path": request.url.path}}
    )
