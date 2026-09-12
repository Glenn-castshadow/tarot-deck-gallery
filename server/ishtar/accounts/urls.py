from django.urls import path

from . import views

urlpatterns = [
    path('', views.account),
    path('profile/', views.profile),
    path('birth-storage/', views.birth_storage),
    path('newsletter/', views.newsletter),
    path('delete/', views.delete_account),
]
