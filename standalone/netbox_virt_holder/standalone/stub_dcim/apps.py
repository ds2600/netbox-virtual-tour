from django.apps import AppConfig


class StubDcimConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'stub_dcim'
    verbose_name = 'Stub DCIM (standalone dev only)'
