from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('accounts', '0003_entitlement')]
    operations = [migrations.AddField(
        model_name='user', name='save_birth_details',
        field=models.BooleanField(default=True),
    )]
