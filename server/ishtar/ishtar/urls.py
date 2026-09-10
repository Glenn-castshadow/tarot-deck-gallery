from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path

from accounts.views import SignupOrRequestLoginCodeView
from ishtar.api import health

urlpatterns = [
    path('admin/', admin.site.urls),
    # Must precede the allauth include: allauth's own view never creates an
    # account for an unknown email before sending the code (see accounts/views.py).
    path('_allauth/browser/v1/auth/code/request', SignupOrRequestLoginCodeView.as_api_view(client='browser')),
    path('_allauth/', include('allauth.headless.urls')),
    path('api/health/', health),
    path('api/account/', include('accounts.urls')),
    path('api/readings/', include('readings.urls')),
    path('api/newsletter/', include('newsletter.urls')),
]


def not_found(request, exception=None):
    return JsonResponse({'error': 'Not found.'}, status=404)


def server_error(request):
    # Django calls the handler500 callback with just `request` (no
    # `exception` kwarg -- see handle_uncaught_exception in
    # django/core/handlers/exception.py), and only when DEBUG is False;
    # locally (DJANGO_DEBUG=1) Django's own technical 500 page still shows
    # instead. Without this, an uncaught exception in production renders
    # Django's default HTML error page, breaking the {"error": ...} JSON
    # shape every other endpoint in this API promises.
    return JsonResponse({'error': 'Something went wrong.'}, status=500)


handler404 = 'ishtar.urls.not_found'
handler500 = 'ishtar.urls.server_error'

from django.conf import settings
from django.views.static import serve
if settings.DEBUG:
    from django.urls import re_path
    urlpatterns += [re_path(r'^(?P<path>.*)$', lambda request, path: serve(request, path or 'index.html', document_root=settings.BASE_DIR.parent.parent))]
