from django.urls import path

from . import views

urlpatterns = [
    path('', views.collection),
    path('<int:reading_id>/', views.item),
]
