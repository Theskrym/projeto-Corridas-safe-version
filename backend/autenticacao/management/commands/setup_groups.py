from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from autenticacao.models import Usuario, Veiculo

class Command(BaseCommand):
    help = 'Cria grupos e associa permissões baseado em nivel_acesso'

    def handle(self, *args, **options):
        # Define grupos e suas permissões
        grupos_config = {
            1: {
                'nome': 'Administrador',
                'permissions': ['add_usuario', 'change_usuario', 'delete_usuario', 'view_usuario',
                               'add_veiculo', 'change_veiculo', 'delete_veiculo', 'view_veiculo',
                               'add_group', 'change_group', 'delete_group', 'view_group',
                               'add_refreshtokenlocal', 'change_refreshtokenlocal', 'delete_refreshtokenlocal', 'view_refreshtokenlocal']
            },
            2: {
                'nome': 'Gerente',
                'permissions': ['view_usuario', 'change_usuario',
                               'add_veiculo', 'change_veiculo', 'view_veiculo',
                               'view_refreshtokenlocal']
            },
            3: {
                'nome': 'Motorista',
                'permissions': ['view_usuario', 'view_veiculo']
            },
            4: {
                'nome': 'Operador',
                'permissions': ['view_usuario', 'view_veiculo']
            },
            5: {
                'nome': 'Visualizador',
                'permissions': ['view_usuario', 'view_veiculo']
            }
        }

        # Criar grupos
        for nivel, config in grupos_config.items():
            group, created = Group.objects.get_or_create(name=config['nome'])
            
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Grupo "{config["nome"]}" criado'))
            else:
                self.stdout.write(self.style.WARNING(f'→ Grupo "{config["nome"]}" já existe'))
                group.permissions.clear()  # Limpar permissões antigas

            # Adicionar permissões
            for perm_name in config['permissions']:
                try:
                    # Primeiro tenta com Usuario
                    try:
                        permission = Permission.objects.get(
                            content_type=ContentType.objects.get_for_model(Usuario),
                            codename=perm_name
                        )
                    except Permission.DoesNotExist:
                        # Se não encontrar, tenta com Veiculo
                        try:
                            permission = Permission.objects.get(
                                content_type=ContentType.objects.get_for_model(Veiculo),
                                codename=perm_name
                            )
                        except Permission.DoesNotExist:
                            # Se ainda não encontrar, pula
                            self.stdout.write(self.style.WARNING(f'  ⚠ Permissão "{perm_name}" não encontrada'))
                            continue
                    
                    group.permissions.add(permission)
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'  ✗ Erro ao adicionar permissão "{perm_name}": {str(e)}'))

            self.stdout.write(self.style.SUCCESS(f'  → {len(config["permissions"])} permissões associadas ao grupo "{config["nome"]}"'))

        # Associar usuários existentes aos grupos
        for usuario in Usuario.objects.all():
            nivel = usuario.nivel_acesso
            if nivel in grupos_config:
                grupo = Group.objects.get(name=grupos_config[nivel]['nome'])
                usuario.groups.clear()
                usuario.groups.add(grupo)
                self.stdout.write(self.style.SUCCESS(f'✓ Usuário "{usuario.login}" adicionado ao grupo "{grupo.name}"'))

        self.stdout.write(self.style.SUCCESS('\n✓ Setup de grupos e permissões concluído!'))
