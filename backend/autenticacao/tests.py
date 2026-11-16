"""
Unit tests for ELIAS Phase 2A - Ride Management Operations
Tests the 7 core ride management fluxos:
1. Alterar rota antes de iniciar
2. Alterar rota durante corrida
3. Cancelamento durante corrida
4. Motorista recusa (com reassignação)
5. Timeout processing
6. Conflito de veículo
7. Adiamento de corrida
"""

import io
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta, datetime, time, date
from unittest.mock import patch
from openpyxl import load_workbook
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from .models import ConsentimentoLGPD, Usuario, Corridas, Veiculo, Notificacao
from .relatorio_views import hex_to_argb
from .corrida_helpers import (
    alterar_rota_antes_iniciar,
    alterar_rota_durante_corrida,
    cancelar_corrida_em_andamento,
    motorista_recusa,
    processar_corridas_timeout,
    validar_disponibilidade_veiculo,
    adiar_corrida,
)


class TestNotificacaoPushNativo(APITestCase):
    def test_criar_notificacao_envia_push_para_usuario_com_fcm_token(self):
        usuario = Usuario.objects.create_user(
            login='motorista-push',
            email='motorista.push@cesmac.edu.br',
            password='123456',
            nome='Motorista Push',
            nivel_acesso=3,
            fcm_token='ExponentPushToken[abc123]'
        )

        with patch('autenticacao.signals.requests.post') as mock_post:
            mock_post.return_value.raise_for_status.return_value = None
            mock_post.return_value.status_code = 200

            Notificacao.objects.create(
                usuario=usuario,
                titulo='Nova corrida',
                mensagem='Uma corrida foi atribuída a você.',
                tipo=Notificacao.TipoChoices.RIDE_CREATED,
            )

        mock_post.assert_called_once()
        payload = mock_post.call_args.kwargs['json']
        self.assertEqual(payload['to'], 'ExponentPushToken[abc123]')
        self.assertEqual(payload['title'], 'Nova corrida')
        self.assertEqual(payload['body'], 'Uma corrida foi atribuída a você.')


class TestConsentimentoEExclusaoDeConta(APITestCase):
    def setUp(self):
        self.usuario = Usuario.objects.create_user(
            login='lgpd-motorista',
            email='lgpd.motorista@cesmac.edu.br',
            password='senha-segura-123',
            nome='Motorista LGPD',
            nivel_acesso=3,
        )
        self.client.force_authenticate(user=self.usuario)

    def test_aviso_exige_autenticacao_e_registra_aceite_da_versao_atual(self):
        anonymous_client = APIClient()
        response = anonymous_client.get(reverse('privacy-notice'))
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

        response = self.client.get(reverse('privacy-notice'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['accepted'])
        version = response.data['version']

        response = self.client.post(reverse('privacy-consent'), {'version': 'versao-antiga'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ConsentimentoLGPD.objects.count(), 0)

        response = self.client.post(reverse('privacy-consent'), {'version': version}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(self.client.get(reverse('privacy-notice')).data['accepted'])

        response = self.client.post(reverse('privacy-consent'), {'version': version}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(ConsentimentoLGPD.objects.filter(usuario=self.usuario).count(), 1)

    def test_exclusao_de_conta_confirma_senha_e_desvincula_historico(self):
        ConsentimentoLGPD.objects.create(usuario=self.usuario, versao_termo='2026-11-v1')
        corrida = Corridas.objects.create(
            ponto_inicio='Campus',
            ponto_chegada='Centro',
            data_inicio=timezone.localdate(),
            motorista=self.usuario,
            criado_por=self.usuario,
        )
        notificacao = Notificacao.objects.create(
            usuario=self.usuario,
            corrida=corrida,
            titulo='Corrida atribuída',
            mensagem='Você recebeu uma nova corrida.',
        )
        endpoint = reverse('delete-own-account')

        response = self.client.delete(endpoint, {'current_password': 'senha-incorreta'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Usuario.objects.filter(pk=self.usuario.pk).exists())

        response = self.client.delete(endpoint, {'current_password': 'senha-segura-123'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Usuario.objects.filter(pk=self.usuario.pk).exists())
        self.assertFalse(Notificacao.objects.filter(pk=notificacao.pk).exists())
        self.assertIsNone(Corridas.objects.get(pk=corrida.pk).motorista)
        self.assertIsNone(Corridas.objects.get(pk=corrida.pk).criado_por)
        self.assertIsNone(ConsentimentoLGPD.objects.get().usuario)


class TestExclusaoDeVeiculo(APITestCase):
    def setUp(self):
        self.admin = Usuario.objects.create_user(
            login='veiculo-admin',
            email='veiculo.admin@cesmac.edu.br',
            password='senha-segura-123',
            nome='Admin Veículos',
            nivel_acesso=1,
        )
        self.motorista = Usuario.objects.create_user(
            login='veiculo-motorista',
            email='veiculo.motorista@cesmac.edu.br',
            password='senha-segura-123',
            nome='Motorista Veículos',
            nivel_acesso=3,
        )

    def test_apenas_administrador_exclui_veiculo_e_corridas_vinculadas_bloqueiam_exclusao(self):
        veiculo = Veiculo.objects.create(nome='Van de teste', placa='TST-1000')
        self.client.force_authenticate(user=self.motorista)
        response = self.client.delete(reverse('veiculo_detail', args=[veiculo.id_veiculo]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Veiculo.objects.filter(pk=veiculo.pk).exists())

        corrida = Corridas.objects.create(
            ponto_inicio='Campus',
            ponto_chegada='Centro',
            data_inicio=timezone.localdate(),
            motorista=self.motorista,
            criado_por=self.admin,
            veiculo=veiculo,
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(reverse('veiculo_detail', args=[veiculo.id_veiculo]))
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertTrue(Veiculo.objects.filter(pk=veiculo.pk).exists())

        corrida.delete()
        response = self.client.delete(reverse('veiculo_detail', args=[veiculo.id_veiculo]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Veiculo.objects.filter(pk=veiculo.pk).exists())


class TestFluxoDeCorridasDoMotorista(APITestCase):
    def setUp(self):
        self.motorista = Usuario.objects.create_user(
            login='fluxo-motorista',
            email='fluxo.motorista@cesmac.edu.br',
            password='senha-segura-123',
            nome='Motorista do Fluxo',
            nivel_acesso=3,
        )
        self.outro_motorista = Usuario.objects.create_user(
            login='fluxo-outro-motorista',
            email='fluxo.outro@cesmac.edu.br',
            password='senha-segura-123',
            nome='Outro Motorista',
            nivel_acesso=3,
        )
        self.admin = Usuario.objects.create_user(
            login='fluxo-admin',
            email='fluxo.admin@cesmac.edu.br',
            password='senha-segura-123',
            nome='Admin do Fluxo',
            nivel_acesso=1,
        )

    def test_motorista_consulta_suas_corridas_e_conclui_somente_a_corrida_atribuida(self):
        corrida = Corridas.objects.create(
            ponto_inicio='Campus',
            ponto_chegada='Centro',
            data_inicio=timezone.localdate(),
            motorista=self.motorista,
            criado_por=self.admin,
        )
        outra_corrida = Corridas.objects.create(
            ponto_inicio='Campus',
            ponto_chegada='Aeroporto',
            data_inicio=timezone.localdate(),
            motorista=self.outro_motorista,
            criado_por=self.admin,
        )
        self.client.force_authenticate(user=self.motorista)

        response = self.client.get(reverse('corrida'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item['id_corrida'] for item in response.data], [corrida.id_corrida])
        self.assertNotIn(outra_corrida.id_corrida, [item['id_corrida'] for item in response.data])

        endpoint = reverse('corrida-detail', args=[corrida.id_corrida])
        response = self.client.patch(endpoint, {'status': 'confirmada'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response = self.client.patch(endpoint, {'status': 'em_andamento'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.post(reverse('corrida-complete', args=[corrida.id_corrida]), {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        corrida.refresh_from_db()
        self.assertEqual(corrida.status, Corridas.StatusChoices.CONCLUIDA)

        response = self.client.patch(
            reverse('corrida-detail', args=[outra_corrida.id_corrida]),
            {'status': 'confirmada'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class TestCriarMotoristaNivelAcesso(APITestCase):
    def setUp(self):
        self.admin_user = Usuario.objects.create_user(
            login='admin-teste',
            email='admin.teste@cesmac.edu.br',
            password='123456',
            nome='Admin Teste',
            nivel_acesso=1,
        )
        self.operador_user = Usuario.objects.create_user(
            login='operador-teste',
            email='operador.teste@cesmac.edu.br',
            password='123456',
            nome='Operador Teste',
            nivel_acesso=4,
        )
        self.gerente_user = Usuario.objects.create_user(
            login='gerente-teste',
            email='gerente.teste@cesmac.edu.br',
            password='123456',
            nome='Gerente Teste',
            nivel_acesso=2,
        )

    def test_criar_motorista_persiste_nivel_acesso_enviado_por_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            'nome': 'Motorista Teste',
            'email': 'motorista.teste@cesmac.edu.br',
            'telefone': '(85) 99999-9999',
            'matricula': '123456',
            'nivel_acesso': 4,
        }

        response = self.client.post(reverse('criar_motorista'), payload, format='json')

        self.assertEqual(response.status_code, 201)
        usuario = Usuario.objects.get(email='motorista.teste@cesmac.edu.br')
        self.assertEqual(usuario.nivel_acesso, 4)
        self.assertEqual(response.json()['usuario']['nivel_acesso'], 4)

    def test_criar_motorista_forca_nivel_acesso_para_motorista_quando_operador(self):
        self.client.force_authenticate(user=self.operador_user)
        payload = {
            'nome': 'Motorista Forçado',
            'email': 'motorista.forcado@cesmac.edu.br',
            'telefone': '(85) 99999-8888',
            'matricula': '654321',
            'nivel_acesso': 1,
        }

        response = self.client.post(reverse('criar_motorista'), payload, format='json')

        self.assertEqual(response.status_code, 201)
        usuario = Usuario.objects.get(email='motorista.forcado@cesmac.edu.br')
        self.assertEqual(usuario.nivel_acesso, 3)
        self.assertEqual(response.json()['usuario']['nivel_acesso'], 3)

    def test_gerente_nao_pode_criar_usuario_administrador(self):
        self.client.force_authenticate(user=self.gerente_user)
        payload = {
            'nome': 'Admin por Gerente',
            'email': 'admin.gerente@cesmac.edu.br',
            'telefone': '(85) 99999-7777',
            'matricula': '777777',
            'nivel_acesso': 1,
        }

        response = self.client.post(reverse('criar_motorista'), payload, format='json')

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Usuario.objects.filter(email='admin.gerente@cesmac.edu.br').exists())


class TestHomeEndpointsPermissoes(APITestCase):
    def setUp(self):
        self.admin_user = Usuario.objects.create_user(
            login='home-admin',
            email='home.admin@cesmac.edu.br',
            password='123456',
            nome='Home Admin',
            nivel_acesso=1,
        )
        self.gerente_user = Usuario.objects.create_user(
            login='home-gerente',
            email='home.gerente@cesmac.edu.br',
            password='123456',
            nome='Home Gerente',
            nivel_acesso=2,
        )
        self.operador_user = Usuario.objects.create_user(
            login='home-operador',
            email='home.operador@cesmac.edu.br',
            password='123456',
            nome='Home Operador',
            nivel_acesso=4,
        )

    def test_gerente_pode_acessar_home_stats(self):
        self.client.force_authenticate(user=self.gerente_user)
        response = self.client.get(reverse('home_stats'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('motoristas', response.json())
        self.assertIn('veiculos', response.json())
        self.assertIn('corridas', response.json())

    def test_operador_pode_acessar_home_stats(self):
        self.client.force_authenticate(user=self.operador_user)
        response = self.client.get(reverse('home_stats'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('motoristas', response.json())
        self.assertIn('veiculos', response.json())
        self.assertIn('corridas', response.json())

    def test_gerente_pode_acessar_relatorios(self):
        self.client.force_authenticate(user=self.gerente_user)
        response = self.client.get(reverse('relatorios'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('resumo', response.json())
        self.assertIn('corridas', response.json())

    def test_operador_pode_acessar_relatorios(self):
        self.client.force_authenticate(user=self.operador_user)
        response = self.client.get(reverse('relatorios'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('resumo', response.json())
        self.assertIn('corridas', response.json())

    def test_perfis_de_relatorio_podem_ler_cores_mas_somente_admin_pode_altera_las(self):
        self.client.force_authenticate(user=self.gerente_user)
        read_response = self.client.get(reverse('status_colors'))
        write_response = self.client.post(reverse('status_colors'), {'colors': []}, format='json')

        self.assertEqual(read_response.status_code, status.HTTP_200_OK)
        self.assertEqual(write_response.status_code, status.HTTP_403_FORBIDDEN)


class TestRelatoriosComFiltros(APITestCase):
    def setUp(self):
        self.admin = Usuario.objects.create_user(
            login='relatorio-admin',
            email='relatorio.admin@cesmac.edu.br',
            password='123456',
            nome='Admin Relatório',
            nivel_acesso=1,
        )
        self.motorista = Usuario.objects.create_user(
            login='relatorio-motorista',
            email='relatorio.motorista@cesmac.edu.br',
            password='123456',
            nome='Motorista Relatório',
            nivel_acesso=3,
        )
        self.veiculo = Veiculo.objects.create(nome='Van Azul', placa='REL-1000')
        self.client.force_authenticate(user=self.admin)

    def criar_corrida(self, ponto_inicio, status_corrida):
        return Corridas.objects.create(
            ponto_inicio=ponto_inicio,
            ponto_chegada='Centro',
            data_inicio=timezone.localdate(),
            solicitante='Equipe de teste',
            motorista=self.motorista,
            veiculo=self.veiculo,
            status=status_corrida,
        )

    def definir_data_solicitacao(self, corrida, dia):
        data_hora = timezone.make_aware(datetime.combine(dia, time(12, 0)))
        Corridas.objects.filter(pk=corrida.pk).update(data_solicitacao=data_hora)

    def test_filtros_de_busca_e_status_sao_iguais_no_json_e_no_excel_colorido(self):
        corrida_incluida = self.criar_corrida('Campus Norte', Corridas.StatusChoices.CONCLUIDA)
        self.criar_corrida('Campus Sul', Corridas.StatusChoices.PENDENTE)
        params = {'status': 'concluida', 'q': 'Van Azul'}

        response = self.client.get(reverse('relatorios'), params)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['resumo']['total_corridas'], 1)
        self.assertEqual(response.data['corridas'][0]['id_corrida'], corrida_incluida.id_corrida)

        with patch(
            'autenticacao.relatorio_views.load_status_colors',
            return_value={'colors': [{'status': 'concluida', 'color': '#007AFF'}]},
        ):
            export = self.client.get(reverse('relatorios_download'), params)

        self.assertEqual(export.status_code, status.HTTP_200_OK)
        workbook = load_workbook(io.BytesIO(b''.join(export.streaming_content)))
        sheet = workbook['Relatório de Corridas']
        self.assertEqual(sheet.max_row, 2)
        self.assertEqual(sheet['B2'].value, 'concluida')
        self.assertEqual(sheet['B2'].fill.fgColor.rgb, hex_to_argb('#007AFF', transparency=0.3))

    def test_data_inicial_e_final_isoladas_filtram_sem_intervalo_padrao_implicito(self):
        hoje = timezone.localdate()
        data_antiga = hoje - timedelta(days=10)
        data_recente = hoje - timedelta(days=2)
        corrida_antiga = self.criar_corrida('Campus Norte', Corridas.StatusChoices.PENDENTE)
        corrida_recente = self.criar_corrida('Campus Sul', Corridas.StatusChoices.CONCLUIDA)
        self.definir_data_solicitacao(corrida_antiga, data_antiga)
        self.definir_data_solicitacao(corrida_recente, data_recente)

        desde_recente = self.client.get(reverse('relatorios'), {'data_inicio': data_recente.isoformat()})
        ate_antiga = self.client.get(reverse('relatorios'), {'data_fim': data_antiga.isoformat()})

        self.assertEqual([item['id_corrida'] for item in desde_recente.data['corridas']], [corrida_recente.id_corrida])
        self.assertEqual([item['id_corrida'] for item in ate_antiga.data['corridas']], [corrida_antiga.id_corrida])

    def test_rejeita_datas_invalidas_e_intervalos_invertidos(self):
        endpoint = reverse('relatorios')
        invalid_date = self.client.get(endpoint, {'data_inicio': '2026-02-30'})
        reversed_range = self.client.get(endpoint, {'data_inicio': '2026-11-17', 'data_fim': '2026-11-16'})

        self.assertEqual(invalid_date.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(reversed_range.status_code, status.HTTP_400_BAD_REQUEST)


class TestListarMotoristas(APITestCase):
    def test_listar_motoristas_retorna_apenas_nivel_acesso_tres(self):
        Usuario.objects.create_user(
            login='admin-lista',
            email='admin.lista@cesmac.edu.br',
            password='123456',
            nome='Admin Lista',
            nivel_acesso=1,
        )
        Usuario.objects.create_user(
            login='gerente-lista',
            email='gerente.lista@cesmac.edu.br',
            password='123456',
            nome='Gerente Lista',
            nivel_acesso=2,
        )
        Usuario.objects.create_user(
            login='motorista-lista',
            email='motorista.lista@cesmac.edu.br',
            password='123456',
            nome='Motorista Lista',
            nivel_acesso=3,
        )
        Usuario.objects.create_user(
            login='operador-lista',
            email='operador.lista@cesmac.edu.br',
            password='123456',
            nome='Operador Lista',
            nivel_acesso=4,
        )

        response = self.client.get(reverse('listar_motoristas'))

        self.assertEqual(response.status_code, 200)
        payload = response.json()['data']
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]['nivel_acesso'], 3)
        self.assertEqual(payload[0]['nome'], 'Motorista Lista')


class TestAlterarRotaAntes(TestCase):
    """Test FLUXO 2: Alterar rota antes de iniciar ride"""
    
    def setUp(self):
        """Set up test data"""
        self.usuario_admin = Usuario.objects.create(
            nome="Admin Test",
            email="admin@test.com",
            nivel_acesso=1,
            telefone="(85) 99999-9999"
        )
        self.usuario_motorista = Usuario.objects.create(
            nome="Motorista Test",
            email="motorista@test.com",
            nivel_acesso=3,
            telefone="(85) 99999-8888"
        )
        self.veiculo = Veiculo.objects.create(
            nome="Veiculo Teste",
            placa="ABC1234",
            status='disponivel'
        )
        self.corrida = Corridas.objects.create(
            criado_por=self.usuario_admin,
            motorista=self.usuario_motorista,
            veiculo=self.veiculo,
            ponto_saida="Ponto A",
            ponto_chegada="Ponto B",
            data_inicio=timezone.now() + timedelta(hours=2),
            status='confirmada'
        )
    
    def test_alterar_rota_antes_confirmada(self):
        """Test changing route for a CONFIRMADA ride"""
        resultado = alterar_rota_antes_iniciar(
            corrida_id=self.corrida.id_corrida,
            novo_ponto_chegada="Ponto C",
            novas_paradas=None
        )
        
        self.assertTrue(resultado['sucesso'])
        self.assertTrue(resultado['reconfirmacao_necessaria'])
        
        # Verify ride status changed to RECONFIRMACAO_NECESSARIA
        corrida_atualizada = Corridas.objects.get(id_corrida=self.corrida.id_corrida)
        self.assertEqual(corrida_atualizada.status, 'reconfirmacao_necessaria')
        self.assertEqual(corrida_atualizada.ponto_chegada, "Ponto C")
    
    def test_alterar_rota_nonexistent_ride(self):
        """Test changing route for non-existent ride"""
        resultado = alterar_rota_antes_iniciar(
            corrida_id=99999,
            novo_ponto_chegada="Ponto X",
            novas_paradas=None
        )
        
        self.assertFalse(resultado['sucesso'])
        self.assertIn('erro', resultado)


class TestAlterarRotaDurante(TestCase):
    """Test FLUXO 3: Alterar rota durante ride execution"""
    
    def setUp(self):
        """Set up test data"""
        self.usuario_admin = Usuario.objects.create(
            nome="Admin Test",
            email="admin@test.com",
            nivel_acesso=1,
            telefone="(85) 99999-9999"
        )
        self.usuario_motorista = Usuario.objects.create(
            nome="Motorista Test",
            email="motorista@test.com",
            nivel_acesso=3,
            telefone="(85) 99999-8888"
        )
        self.veiculo = Veiculo.objects.create(
            nome="Veiculo Teste",
            placa="ABC1234",
            status='disponivel'
        )
        self.corrida = Corridas.objects.create(
            criado_por=self.usuario_admin,
            motorista=self.usuario_motorista,
            veiculo=self.veiculo,
            ponto_saida="Ponto A",
            ponto_chegada="Ponto B",
            data_inicio=timezone.now() - timedelta(minutes=15),
            status='em_andamento'
        )
    
    def test_alterar_rota_durante_em_andamento(self):
        """Test changing route during an ongoing ride"""
        notificacoes_antes = Notificacao.objects.count()
        
        resultado = alterar_rota_durante_corrida(
            corrida_id=self.corrida.id_corrida,
            novo_ponto_chegada="Ponto X",
            admin_usuario_id=self.usuario_admin.id_usuario
        )
        
        self.assertTrue(resultado['sucesso'])
        self.assertEqual(resultado['notificacoes_enviadas'], 2)
        
        # Verify ride route changed
        corrida_atualizada = Corridas.objects.get(id_corrida=self.corrida.id_corrida)
        self.assertEqual(corrida_atualizada.ponto_chegada, "Ponto X")
        
        # Verify notifications were created
        self.assertEqual(Notificacao.objects.count(), notificacoes_antes + 2)


class TestCancelamentoCorrida(TestCase):
    """Test FLUXO 4: Cancelamento durante corrida"""
    
    def setUp(self):
        """Set up test data"""
        self.usuario_admin = Usuario.objects.create(
            nome="Admin Test",
            email="admin@test.com",
            nivel_acesso=1,
            telefone="(85) 99999-9999"
        )
        self.usuario_motorista = Usuario.objects.create(
            nome="Motorista Test",
            email="motorista@test.com",
            nivel_acesso=3,
            telefone="(85) 99999-8888"
        )
        self.veiculo = Veiculo.objects.create(
            nome="Veiculo Teste",
            placa="ABC1234",
            status='disponivel'
        )
        self.corrida = Corridas.objects.create(
            criado_por=self.usuario_admin,
            motorista=self.usuario_motorista,
            veiculo=self.veiculo,
            ponto_saida="Ponto A",
            ponto_chegada="Ponto B",
            data_inicio=timezone.now() - timedelta(minutes=10),
            status='em_andamento'
        )
    
    def test_cancelar_corrida_em_andamento(self):
        """Test canceling an ongoing ride"""
        resultado = cancelar_corrida_em_andamento(
            corrida_id=self.corrida.id_corrida,
            quem_cancelou_id=self.usuario_admin.id_usuario,
            motivo="Motivo de teste"
        )
        
        self.assertTrue(resultado['sucesso'])
        self.assertTrue(resultado['cancelada'])
        self.assertGreater(resultado['tempo_percorrido_minutos'], 0)
        
        # Verify ride status changed
        corrida_atualizada = Corridas.objects.get(id_corrida=self.corrida.id_corrida)
        self.assertEqual(corrida_atualizada.status, 'cancelada')


class TestMotoristaRecusa(TestCase):
    """Test FLUXO 5: Motorista recusa com reassignação automática"""
    
    def setUp(self):
        """Set up test data"""
        self.usuario_admin = Usuario.objects.create(
            nome="Admin Test",
            email="admin@test.com",
            nivel_acesso=1,
            telefone="(85) 99999-9999"
        )
        self.usuario_motorista1 = Usuario.objects.create(
            nome="Motorista 1",
            email="motorista1@test.com",
            nivel_acesso=3,
            telefone="(85) 99999-8888"
        )
        self.usuario_motorista2 = Usuario.objects.create(
            nome="Motorista 2",
            email="motorista2@test.com",
            nivel_acesso=3,
            telefone="(85) 99999-7777"
        )
        self.veiculo = Veiculo.objects.create(
            nome="Veiculo Teste",
            placa="ABC1234",
            status='disponivel'
        )
        self.corrida = Corridas.objects.create(
            criado_por=self.usuario_admin,
            motorista=self.usuario_motorista1,
            veiculo=self.veiculo,
            ponto_saida="Ponto A",
            ponto_chegada="Ponto B",
            data_inicio=timezone.now() + timedelta(hours=2),
            status='confirmada'
        )
    
    def test_motorista_recusa_corrida(self):
        """Test motorista refusing a ride"""
        resultado = motorista_recusa(
            corrida_id=self.corrida.id_corrida,
            motorista_id=self.usuario_motorista1.id_usuario
        )
        
        self.assertTrue(resultado['sucesso'])
        
        # Verify ride status changed
        corrida_atualizada = Corridas.objects.get(id_corrida=self.corrida.id_corrida)
        self.assertEqual(corrida_atualizada.status, 'recusada')


class TestTimeoutProcessing(TestCase):
    """Test FLUXO 6: Timeout processing for unconfirmed rides"""
    
    def setUp(self):
        """Set up test data"""
        self.usuario_admin = Usuario.objects.create(
            nome="Admin Test",
            email="admin@test.com",
            nivel_acesso=1,
            telefone="(85) 99999-9999"
        )
        # Create a ride that should timeout (created > 30 min ago)
        self.corrida_timeout = Corridas.objects.create(
            criado_por=self.usuario_admin,
            ponto_saida="Ponto A",
            ponto_chegada="Ponto B",
            data_inicio=timezone.now() + timedelta(hours=2),
            data_criacao=timezone.now() - timedelta(minutes=35),
            status='pendente'
        )
        # Create a recent ride (shouldn't timeout)
        self.corrida_recente = Corridas.objects.create(
            criado_por=self.usuario_admin,
            ponto_saida="Ponto A",
            ponto_chegada="Ponto B",
            data_inicio=timezone.now() + timedelta(hours=2),
            status='pendente'
        )
    
    def test_processar_corridas_timeout(self):
        """Test timeout processing"""
        resultado = processar_corridas_timeout(minutos_timeout=30)
        
        self.assertTrue(resultado['sucesso'])
        # Should process at least the old ride
        self.assertGreaterEqual(resultado.get('corridas_timeout_processadas', 0), 1)
        
        # Verify timeout ride status changed
        corrida_atualizada = Corridas.objects.get(id_corrida=self.corrida_timeout.id_corrida)
        self.assertEqual(corrida_atualizada.status, 'timeout_sem_confirmacao')


class TestConflitosVeiculo(TestCase):
    """Test FLUXO 7: Vehicle conflict detection"""
    
    def setUp(self):
        """Set up test data"""
        self.usuario_admin = Usuario.objects.create(
            nome="Admin Test",
            email="admin@test.com",
            nivel_acesso=1,
            telefone="(85) 99999-9999"
        )
        self.veiculo = Veiculo.objects.create(
            nome="Veiculo Teste",
            placa="ABC1234",
            status='disponivel'
        )
        # Create a ride using the vehicle
        self.corrida_existente = Corridas.objects.create(
            criado_por=self.usuario_admin,
            veiculo=self.veiculo,
            ponto_saida="Ponto A",
            ponto_chegada="Ponto B",
            data_inicio=timezone.now() + timedelta(hours=2),
            status='confirmada'
        )
    
    def test_validar_disponibilidade_veiculo(self):
        """Test vehicle availability validation"""
        # Try to use the same vehicle at the same time
        data_inicio = self.corrida_existente.data_inicio
        data_fim = data_inicio + timedelta(hours=1)
        
        disponivel = validar_disponibilidade_veiculo(
            veiculo_id=self.veiculo.id_veiculo,
            data_inicio=data_inicio,
            data_fim=data_fim,
            excluir_corrida_id=None
        )
        
        # Should not be available due to conflict
        self.assertFalse(disponivel)
    
    def test_validar_disponibilidade_veiculo_diferente_horario(self):
        """Test vehicle availability for different time"""
        # Try to use the vehicle at a different time
        data_inicio = self.corrida_existente.data_inicio + timedelta(hours=3)
        data_fim = data_inicio + timedelta(hours=1)
        
        disponivel = validar_disponibilidade_veiculo(
            veiculo_id=self.veiculo.id_veiculo,
            data_inicio=data_inicio,
            data_fim=data_fim,
            excluir_corrida_id=None
        )
        
        # Should be available (no conflict)
        self.assertTrue(disponivel)


class TestAdiamentoCorrida(TestCase):
    """Test FLUXO 7B: Ride postponement"""
    
    def setUp(self):
        """Set up test data"""
        self.usuario_admin = Usuario.objects.create(
            nome="Admin Test",
            email="admin@test.com",
            nivel_acesso=1,
            telefone="(85) 99999-9999"
        )
        self.usuario_motorista = Usuario.objects.create(
            nome="Motorista Test",
            email="motorista@test.com",
            nivel_acesso=3,
            telefone="(85) 99999-8888"
        )
        self.veiculo = Veiculo.objects.create(
            nome="Veiculo Teste",
            placa="ABC1234",
            status='disponivel'
        )
        self.corrida = Corridas.objects.create(
            criado_por=self.usuario_admin,
            motorista=self.usuario_motorista,
            veiculo=self.veiculo,
            ponto_saida="Ponto A",
            ponto_chegada="Ponto B",
            data_inicio=timezone.now() + timedelta(hours=2),
            status='confirmada'
        )
    
    def test_adiar_corrida_confirmada(self):
        """Test postponing a CONFIRMADA ride"""
        nova_data = date.today() + timedelta(days=1)
        nova_hora = time(14, 30, 0)
        
        resultado = adiar_corrida(
            corrida_id=self.corrida.id_corrida,
            nova_data=nova_data,
            nova_hora=nova_hora
        )
        
        self.assertTrue(resultado['sucesso'])
        
        # Verify ride status changed and motorista/veiculo were unassigned
        corrida_atualizada = Corridas.objects.get(id_corrida=self.corrida.id_corrida)
        self.assertEqual(corrida_atualizada.status, 'reconfirmacao_necessaria')
        self.assertIsNone(corrida_atualizada.motorista)
        self.assertIsNone(corrida_atualizada.veiculo)


# ===== API Integration Tests (Optional) =====

class CorridaEndpointsAPITest(APITestCase):
    """Integration tests for Corrida API endpoints"""
    
    def setUp(self):
        """Set up test data and authentication"""
        self.client = APIClient()
        
        self.usuario_admin = Usuario.objects.create(
            nome="Admin Test",
            email="admin@test.com",
            nivel_acesso=1,
            telefone="(85) 99999-9999"
        )
        self.usuario_motorista = Usuario.objects.create(
            nome="Motorista Test",
            email="motorista@test.com",
            nivel_acesso=3,
            telefone="(85) 99999-8888"
        )
        
        # Note: In a real test, you'd use token authentication
        # For now, we assume the API is protected by authentication
    
    def test_alterar_rota_antes_endpoint(self):
        """Test PUT /corridas/{id}/alterar_rota_antes/"""
        # This would require proper authentication setup
        # and should be implemented after auth tests pass
        pass
    
    def test_alterar_rota_durante_endpoint(self):
        """Test PUT /corridas/{id}/alterar_rota_durante/"""
        pass
    
    def test_cancelar_endpoint(self):
        """Test POST /corridas/{id}/cancelar/"""
        pass
    
    def test_adiar_endpoint(self):
        """Test POST /corridas/{id}/adiar/"""
        pass
