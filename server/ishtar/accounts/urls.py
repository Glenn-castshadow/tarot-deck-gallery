from django.urls import path

from . import views

urlpatterns = [
    path('', views.account),
    path('profile/', views.profile),
    path('newsletter/', views.newsletter),
]
