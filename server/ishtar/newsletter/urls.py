from django.urls import path

from . import views

urlpatterns = [
    path('subscribe', views.subscribe_view),
    path('unsubscribe', views.unsubscribe_view),
]
