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
]


def not_found(request, exception=None):
    return JsonResponse({'error': 'Not found.'}, status=404)


handler404 = 'ishtar.urls.not_found'
