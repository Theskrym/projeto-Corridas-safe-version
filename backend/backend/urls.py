from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('autenticacao.urls')),  # Esta linha é crucial
    path('auth/', include('autenticacao.urls')),
]