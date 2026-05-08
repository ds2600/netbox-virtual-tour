from django.apps import AppConfig


class StandaloneAppConfig(AppConfig):
    """Used only in standalone dev mode (not in NetBox)."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'netbox_virtual_tour'
    verbose_name = 'Virtual Tour'
