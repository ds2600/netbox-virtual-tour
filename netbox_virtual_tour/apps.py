"""App configuration. Used in standalone mode only — NetBox uses
the PluginConfig in __init__.py."""
from django.apps import AppConfig


class StandaloneAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'netbox_virtual_tour'
    verbose_name = 'Virtual Tour'
