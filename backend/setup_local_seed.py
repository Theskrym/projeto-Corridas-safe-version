import os
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from django.contrib.auth.hashers import make_password
from autenticacao.models import Usuario, Veiculo, Corridas, Notificacao


Usuario.objects.filter(login__in=['admin', 'motorista1', 'motorista2', 'operador1']).delete()
Veiculo.objects.all().delete()
Corridas.objects.all().delete()

users = [
    ('Admin Sistema', '85987654321', 'ADM001', 'admin@cesmac.edu.br', 'admin', 1, True),
    ('Joao Silva', '85988776655', 'MOT001', 'motorista1@cesmac.edu.br', 'motorista1', 3, True),
    ('Maria Santos', '85988665544', 'MOT002', 'motorista2@cesmac.edu.br', 'motorista2', 3, True),
    ('Carlos Oliveira', '85988554433', 'OP001', 'operador1@cesmac.edu.br', 'operador1', 4, True),
]

for nome, telefone, matricula, email, login, nivel, is_active in users:
    Usuario.objects.create(
        nome=nome,
        telefone=telefone,
        matricula=matricula,
        email=email,
        login=login,
        password=make_password('admin123'),
        nivel_acesso=nivel,
        is_active=is_active,
    )

veiculos = [
    ('Van Branca 01', 'ABC-1234', 'disponivel'),
    ('Van Branca 02', 'ABC-1235', 'disponivel'),
    ('Microonibus 01', 'DEF-5678', 'disponivel'),
    ('Microonibus 02', 'GHI-9101', 'manutencao'),
    ('Van Executiva', 'JKL-1121', 'disponivel'),
]

veiculo_map = {}
for nome, placa, status in veiculos:
    obj = Veiculo.objects.create(nome=nome, placa=placa, status=status)
    veiculo_map[placa] = obj

admin = Usuario.objects.get(login='admin')
motorista1 = Usuario.objects.get(login='motorista1')
motorista2 = Usuario.objects.get(login='motorista2')
base = datetime.now()

Corridas.objects.create(
    ponto_inicio='Campus CESMAC Fortaleza',
    solicitante='Direção',
    destinos='Campus CESMAC Maracanau',
    servico='Transporte de Professores',
    ponto_chegada='Campus CESMAC Maracanau',
    horario_inicio='08:00:00',
    horario_retorno='12:00:00',
    motorista=motorista1,
    veiculo=veiculo_map['ABC-1234'],
    criado_por=admin,
    status='confirmada',
    data_inicio=base.date(),
)

Corridas.objects.create(
    ponto_inicio='Dormitorio Universitario',
    solicitante='Alunos',
    destinos='Campus CESMAC Fortaleza',
    servico='Transporte de Alunos',
    ponto_chegada='Campus CESMAC Fortaleza',
    horario_inicio='07:30:00',
    horario_retorno='08:30:00',
    motorista=motorista2,
    veiculo=veiculo_map['ABC-1235'],
    criado_por=admin,
    status='pendente',
    data_inicio=base.date(),
)

Corridas.objects.create(
    ponto_inicio='Campus CESMAC Fortaleza',
    solicitante='Eventos',
    destinos='Centro de Fortaleza',
    servico='Transporte para Evento',
    ponto_chegada='Centro de Fortaleza',
    horario_inicio='18:00:00',
    horario_retorno='23:00:00',
    motorista=motorista1,
    veiculo=veiculo_map['DEF-5678'],
    criado_por=admin,
    status='confirmada',
    data_inicio=(base + timedelta(days=1)).date(),
)

Corridas.objects.create(
    ponto_inicio='Zona Leste',
    solicitante='Administrativo',
    destinos='Campus CESMAC Fortaleza',
    servico='Transporte Interno',
    ponto_chegada='Campus CESMAC Fortaleza',
    horario_inicio='14:00:00',
    horario_retorno='17:00:00',
    motorista=motorista2,
    veiculo=veiculo_map['ABC-1234'],
    criado_por=admin,
    status='em_andamento',
    data_inicio=base.date(),
)

for user in Usuario.objects.filter(login__in=['admin', 'motorista1', 'motorista2', 'operador1']):
    Notificacao.objects.get_or_create(
        usuario=user,
        titulo='Sistema ELIAS',
        mensagem='Você recebeu um aviso do painel administrativo. Verifique as novas atualizações.',
        defaults={'tipo': Notificacao.TipoChoices.RIDE_CREATED, 'lida': False}
    )

print('usuarios=', Usuario.objects.count())
print('veiculos=', Veiculo.objects.count())
print('corridas=', Corridas.objects.count())
print('notificacoes=', Notificacao.objects.count())
print('admin=', list(Usuario.objects.filter(login='admin').values_list('login', 'email', 'nivel_acesso')))
