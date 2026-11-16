from xml.etree.ElementInclude import include

from django.urls import path, include as url_include
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView, ForgotPasswordView, AutoLoginView, ChangePasswordView, 
    user_personal_data, privacy_notice, accept_privacy_notice, delete_own_account,
    listar_veiculos, veiculo_detail, veiculo_conflitos, listar_motoristas, marcar_multiplas,
    motorista_detail, criar_motorista, LoginV2View, LoginTestView, RefreshTokenView, CorridaViewSet, NotificacaoViewSet
)
from .relatorio_views import relatorios, home_stats, relatorios_download, notificacoes_contagem, status_colors

router = DefaultRouter()
router.register(r'notificacoes', NotificacaoViewSet, basename='notificacao')

urlpatterns = [
    # IMPORTANTE: precisa vir ANTES do router, senão "marcar_multiplas" é
    # interpretado como pk na rota de detalhe do NotificacaoViewSet
    # (^notificacoes/(?P<pk>[^/.]+)/$), que não aceita POST -> 405.
    path('notificacoes/marcar_multiplas/', marcar_multiplas, name='marcar_multiplas'),

    # Router para NotificacaoViewSet
    path('', url_include(router.urls)),
    
    # Rotas de autenticação antigas
    path('login/', LoginView.as_view(), name='login'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('auto-login/', AutoLoginView.as_view(), name='auto-login'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('corrida/', CorridaViewSet.as_view({'get': 'list', 'post': 'create'}), name='corrida'),
    path('corrida/<int:pk>/', CorridaViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'put': 'update'}), name='corrida-detail'),
    path('corrida/<int:pk>/complete_ride/', CorridaViewSet.as_view({'post': 'complete_ride'}), name='corrida-complete'),
    path('corrida/<int:pk>/recusar/', CorridaViewSet.as_view({'post': 'recusar'}), name='corrida-recusar'),

    # Rotas de autenticação NOVAS (integradas com API externa)
    path('login-v2/', LoginV2View.as_view(), name='login-v2'),  # Login com API externa
    path('login-test/', LoginTestView.as_view(), name='login-test'),  # Login de teste (sem API)
    path('refresh-token/', RefreshTokenView.as_view(), name='refresh-token'),  # Renovar token
    
    # Outras rotas
    path('user_personal_data/', user_personal_data, name='user_personal_data'),
    path('privacy-notice/', privacy_notice, name='privacy-notice'),
    path('privacy-consent/', accept_privacy_notice, name='privacy-consent'),
    path('account/delete/', delete_own_account, name='delete-own-account'),
    path('veiculos/', listar_veiculos, name='listar_veiculos'),
    path('veiculos/<int:id>/', veiculo_detail, name='veiculo_detail'),
    path('veiculos/<int:id>/conflitos/', veiculo_conflitos, name='veiculo_conflitos'),
    path('motoristas/', listar_motoristas, name='listar_motoristas'),
    path('motoristas/novo/', criar_motorista, name='criar_motorista'),
    path('motoristas/<int:id>/', motorista_detail, name='motorista_detail'),
    
    # Rotas de relatórios e estatísticas
    path('relatorios/', relatorios, name='relatorios'),
    path('relatorios/download/', relatorios_download, name='relatorios_download'),
    path('status-colors/', status_colors, name='status_colors'),
    path('home/stats/', home_stats, name='home_stats'),
    path('notificacoes/contagem/', notificacoes_contagem, name='notificacoes_contagem'),
]