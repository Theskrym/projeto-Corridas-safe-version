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

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta, datetime, time, date
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from .models import Usuario, Corridas, Veiculo, Notificacao
from .corrida_helpers import (
    alterar_rota_antes_iniciar,
    alterar_rota_durante_corrida,
    cancelar_corrida_em_andamento,
    motorista_recusa,
    processar_corridas_timeout,
    validar_disponibilidade_veiculo,
    adiar_corrida,
)


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
