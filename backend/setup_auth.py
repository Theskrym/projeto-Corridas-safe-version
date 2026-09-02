"""
Script para configurar grupos e permissões automaticamente.
Execute: python manage.py shell < setup_auth.py
"""

from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from autenticacao.models import Usuario, Veiculo

print("🔧 Configurando grupos e permissões...\n")

# Define grupos e suas permissões
grupos_config = {
    1: {
        'nome':  '1. Administrador',
        'permissions': ['add_usuario', 'change_usuario', 'delete_usuario', 'view_usuario',
                       'add_veiculo', 'change_veiculo', 'delete_veiculo', 'view_veiculo',
                       'add_group', 'change_group', 'delete_group', 'view_group',
                       'add_refreshtokenlocal', 'change_refreshtokenlocal', 'delete_refreshtokenlocal', 'view_refreshtokenlocal']
    },
    2: {
        'nome': '2. Gerente',
        'permissions': ['view_usuario', 'change_usuario',
                       'add_veiculo', 'change_veiculo', 'view_veiculo',
                       'view_refreshtokenlocal']
    },
    3: {
        'nome': '3. Motorista',
        'permissions': ['view_usuario', 'view_veiculo']
    },
    4: {
        'nome': '4. Operador',
        'permissions': ['view_usuario', 'view_veiculo']
    },
    5: {
        'nome': '5. Visualizador',
        'permissions': ['view_usuario', 'view_veiculo']
    }
}

# Criar grupos
for nivel, config in grupos_config.items():
    group, created = Group.objects.get_or_create(name=config['nome'])
    
    if created:
        print(f'✓ Grupo "{config["nome"]}" criado')
    else:
        print(f'→ Grupo "{config["nome"]}" já existe')
        group.permissions.clear()

    # Adicionar permissões
    perms_added = 0
    for perm_name in config['permissions']:
        try:
            permission = Permission.objects.get(codename=perm_name)
            group.permissions.add(permission)
            perms_added += 1
        except Permission.DoesNotExist:
            pass

    print(f'  → {perms_added} permissões associadas\n')

# Associar usuários existentes aos grupos
print("👥 Associando usuários aos grupos...\n")
for usuario in Usuario.objects.all():
    nivel = usuario.nivel_acesso
    if nivel in grupos_config:
        grupo = Group.objects.get(name=grupos_config[nivel]['nome'])
        usuario.groups.clear()
        usuario.groups.add(grupo)
        print(f'✓ Usuário "{usuario.login}" → Grupo "{grupo.name}"')

print("\n✅ Setup concluído!")
