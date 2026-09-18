"""Ishtar Insights account service settings. Secrets come from the environment."""
import os
from pathlib import Path

from django.core.management.utils import get_random_secret_key

BASE_DIR = Path(__file__).resolve().parent.parent


def _development_secret_key():
    """A SECRET_KEY for local development that is stable across process restarts.

    Session cookies (and allauth's in-progress login-by-code state, which lives
    in request.session) are signed with SECRET_KEY. get_random_secret_key()
    alone would mint a new key on every process start, and runserver's
    autoreloader restarts the process on every saved file -- silently
    invalidating every open session mid-edit. Persist the generated key next
    to manage.py (gitignored) and reuse it instead of regenerating it.
    """
    key_path = BASE_DIR / '.dev-secret-key'
    try:
        existing = key_path.read_text(encoding='utf-8').strip()
        if existing:
            return existing
    except OSError:
        pass  # missing, unreadable, etc. -- generate a fresh one below.
    key = get_random_secret_key()
    try:
        key_path.write_text(key, encoding='utf-8')
    except OSError:
        # Read-only filesystem or similar -- management commands must still
        # work, so fall back to this in-memory key rather than raising. It
        # just won't be stable across process restarts in this environment.
        pass
    return key


SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY') or _development_secret_key()
DEBUG = os.environ.get('DJANGO_DEBUG') == '1'
ALLOWED_HOSTS = [h for h in os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1,testserver').split(',') if h]
CSRF_TRUSTED_ORIGINS = [o for o in os.environ.get('DJANGO_CSRF_TRUSTED_ORIGINS', '').split(',') if o]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'allauth',
    'allauth.account',
    'allauth.headless',
    'anymail',
    'accounts',
    'readings',
    'newsletter',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]

ROOT_URLCONF = 'ishtar.urls'
WSGI_APPLICATION = 'ishtar.wsgi.application'

TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [],
    'APP_DIRS': True,
    'OPTIONS': {'context_processors': [
        'django.template.context_processors.request',
        'django.contrib.auth.context_processors.auth',
        'django.contrib.messages.context_processors.messages',
    ]},
}]

DATABASES = {'default': {
    'ENGINE': 'django.db.backends.sqlite3',
    'NAME': os.environ.get('DJANGO_DB_PATH', str(BASE_DIR / 'dev.sqlite3')),
    'OPTIONS': {
        'init_command': 'PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=5000;',
        'transaction_mode': 'IMMEDIATE',
    },
}}

# Shared across processes on purpose: gunicorn runs 2 worker processes
# (gunicorn.conf.py), and allauth's rate limiter (allauth/core/internal/
# ratelimit.py) keeps its hit counters in django.core.cache.cache via plain
# get()/set() calls -- including the request_login_code bucket
# (ACCOUNT_RATE_LIMITS, "20/m/ip,3/m/key") that accounts/views.py also
# consults. With no CACHES override Django falls back to LocMemCache, which
# is a per-process in-memory dict: each worker would keep an isolated
# counter, so the configured limit would effectively run at up to 2x across
# the pool, and a request throttled on one worker would not count against
# the other. DatabaseCache uses the same sqlite3 file as DATABASES (same
# WAL journal mode and busy_timeout above), so both workers see one shared
# bucket -- verified locally by writing from one OS process and reading the
# same history back from a second, separate process. Requires its table to
# exist (`manage.py createcachetable`, run by deploy-app.sh); the table is
# created automatically for the test database by Django's own test runner
# (django/db/backends/base/creation.py calls createcachetable for every
# test run), so the test suite needs no extra setup.
CACHES = {'default': {
    'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
    'LOCATION': 'django_cache',
}}

AUTH_USER_MODEL = 'accounts.User'
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]

# Sessions and CSRF (spec: HttpOnly, Secure, SameSite Lax, 30 days, refreshed on activity)
SESSION_COOKIE_AGE = 30 * 24 * 3600
SESSION_SAVE_EVERY_REQUEST = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_HTTPONLY = False  # the frontend reads it to send X-CSRFToken
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True

# allauth: passwordless login by code, email is the only identifier
ACCOUNT_USER_MODEL_USERNAME_FIELD = None
ACCOUNT_LOGIN_METHODS = {'email'}
ACCOUNT_SIGNUP_FIELDS = ['email*']
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_EMAIL_VERIFICATION = 'none'  # the login code itself proves ownership
ACCOUNT_LOGIN_BY_CODE_ENABLED = True
ACCOUNT_LOGIN_BY_CODE_SUPPORTS_RESEND = True
ACCOUNT_SESSION_REMEMBER = True
ACCOUNT_EMAIL_SUBJECT_PREFIX = 'Ishtar Insights: '
ACCOUNT_ADAPTER = 'ishtar.adapter.AccountAdapter'
ACCOUNT_PREVENT_ENUMERATION = True
HEADLESS_ONLY = True
HEADLESS_CLIENTS = ('browser',)
HEADLESS_FRONTEND_URLS = {'account_signup': '/'}

# Email: Resend through anymail in production, console locally, locmem in tests
DEFAULT_FROM_EMAIL = os.environ.get('DJANGO_FROM_EMAIL', 'Ishtar Insights <hello@ishtarinsights.com>')
SERVER_EMAIL = DEFAULT_FROM_EMAIL
if os.environ.get('RESEND_API_KEY'):
    EMAIL_BACKEND = 'anymail.backends.resend.EmailBackend'
    ANYMAIL = {'RESEND_API_KEY': os.environ['RESEND_API_KEY']}
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

NEWSLETTER_ORIGINS = set(o for o in os.environ.get('NEWSLETTER_ORIGINS', 'https://ishtarinsights.com,https://www.ishtarinsights.com,http://localhost:8000,http://127.0.0.1:8000').split(',') if o)
NEWSLETTER_CONSENT_VERSION = '2026-09-18-v2'
NEWSLETTER_CONSENT_TEXT = 'Yes, email me the Ishtar Insights newsletter and occasional updates about new readings and features. Emails are sent through Mailchimp.'
# Empty key = every newsletter.mailchimp call is a no-op, so dev and tests stay offline.
MAILCHIMP_API_KEY = os.environ.get('MAILCHIMP_API_KEY', '')
MAILCHIMP_SERVER = os.environ.get('MAILCHIMP_SERVER', '')
MAILCHIMP_AUDIENCE_ID = os.environ.get('MAILCHIMP_AUDIENCE_ID', '')

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'},
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
DATA_UPLOAD_MAX_MEMORY_SIZE = 16 * 1024

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {'console': {'class': 'logging.StreamHandler'}},
    'root': {'handlers': ['console'], 'level': 'WARNING'},
}
