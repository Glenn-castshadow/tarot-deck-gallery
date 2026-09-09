from django.contrib import admin
from django.urls import include, path

from ishtar.api import health

urlpatterns = [
    path('admin/', admin.site.urls),
    path('_allauth/', include('allauth.headless.urls')),
    path('api/health/', health),
]
