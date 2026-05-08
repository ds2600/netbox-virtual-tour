"""
NetBox Virtual Tour Plugin

Provides 360-degree virtual tours for NetBox Sites and Locations.

Runs as a NetBox plugin (production) or a standalone Django app
(development). Set NETBOX_VIRTUAL_TOUR_STANDALONE=True in Django
settings to enable standalone mode — the included standalone/
directory does this automatically.
"""
from django.conf import settings

STANDALONE = getattr(settings, 'NETBOX_VIRTUAL_TOUR_STANDALONE', False)

if STANDALONE:
    # Standalone dev mode — use the plain AppConfig
    default_app_config = 'netbox_virtual_tour.apps.StandaloneAppConfig'

else:
    # NetBox plugin mode.
    # NetBox discovers this plugin via the `config` attribute below.
    # It auto-discovers template_content.py, navigation.py, etc. by
    # convention — do NOT declare them as class attributes here.
    from netbox.plugins import PluginConfig

    class NetBoxVirtualTourConfig(PluginConfig):
        name = 'netbox_virtual_tour'
        verbose_name = 'Virtual Tour'
        description = '360-degree virtual tours for Sites and Locations'
        version = '0.1.0'
        author = 'Your Name'
        base_url = 'virtual-tour'
        min_version = '4.0.0'
        default_settings = {}

    config = NetBoxVirtualTourConfig
