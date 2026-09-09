import os

from django.core.exceptions import ImproperlyConfigured
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ishtar.settings')

# Fail closed: require explicit SECRET_KEY when serving in production (not DEBUG)
debug_mode = os.environ.get('DJANGO_DEBUG') == '1'
if not debug_mode and not os.environ.get('DJANGO_SECRET_KEY'):
    raise ImproperlyConfigured('DJANGO_SECRET_KEY must be set when serving in production.')

application = get_wsgi_application()
