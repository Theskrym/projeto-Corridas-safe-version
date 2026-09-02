# Generated migration to add id_corrida primary key to Corridas table

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('autenticacao', '0002_usuario_groups_usuario_user_permissions'),
    ]

    operations = [
        migrations.AlterField(
            model_name='corridas',
            name='id_corrida',
            field=models.AutoField(db_column='id_corrida', primary_key=True, serialize=False),
        ),
    ]
