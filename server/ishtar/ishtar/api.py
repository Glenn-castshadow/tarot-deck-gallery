"""Small helpers for JSON endpoints. All errors use {"error": message}."""
import json
from functools import wraps

from django.http import JsonResponse


def error(message, status=400):
    return JsonResponse({'error': message}, status=status)


def json_view(methods=('POST',)):
    """Restrict methods and, for bodies, require a JSON object stored on request.json."""
    def decorator(view):
        @wraps(view)
        def wrapper(request, *args, **kwargs):
            if request.method not in methods:
                return error('Method not allowed.', 405)
            request.json = None
            if request.method in ('POST', 'PUT', 'PATCH'):
                if request.content_type != 'application/json':
                    return error('JSON required.', 415)
                try:
                    request.json = json.loads(request.body or b'null')
                except (ValueError, UnicodeDecodeError):
                    return error('Invalid JSON.', 400)
                if not isinstance(request.json, dict):
                    return error('A JSON object is required.', 400)
            return view(request, *args, **kwargs)
        return wrapper
    return decorator


def auth_required(view):
    @wraps(view)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return error('Sign in to continue.', 401)
        return view(request, *args, **kwargs)
    return wrapper


def health(request):
    return JsonResponse({'ok': True})
