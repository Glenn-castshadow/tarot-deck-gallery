"""Small helpers for JSON endpoints. All errors use {"error": message}."""
import json
from functools import wraps

from django.http import JsonResponse


def error(message, status=400):
    return JsonResponse({'error': message}, status=status)


def json_byte_size(value):
    """Return the number of bytes ``value`` occupies as UTF-8 JSON text.

    Byte-size caps on user-supplied JSON must measure this, not
    ``len(json.dumps(value))`` -- that counts Python characters, which either
    under- or over-shoots the real UTF-8 size for non-ASCII text depending on
    ``ensure_ascii``: the default (``ensure_ascii=True``) escapes every
    non-ASCII codepoint to a 6-character ``\\uXXXX`` sequence, wildly
    over-counting ordinary accented text; ``ensure_ascii=False`` instead
    counts each character once, under-counting anything that costs more than
    one UTF-8 byte.

    Raises ValueError if ``value`` cannot be turned into UTF-8 JSON text at
    all. The case that matters for hostile input: CPython's ``json.loads``
    does not validate UTF-16 surrogate pairing, so parsing attacker-supplied
    JSON text like ``{"blob": "\\ud800"}`` happily returns a str holding a
    lone surrogate. ``json.dumps`` passes that character straight through
    unchanged, and only ``.encode('utf-8')`` rejects it -- with an uncaught
    UnicodeEncodeError if nothing catches it first. Callers should treat a
    ValueError from this function the same way they treat "too big": a 400,
    not a 500.
    """
    try:
        return len(json.dumps(value, ensure_ascii=False).encode('utf-8'))
    except (TypeError, ValueError) as exc:
        raise ValueError(f'Value cannot be measured as UTF-8 JSON: {exc}') from exc


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
                except (ValueError, UnicodeDecodeError, RecursionError):
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
