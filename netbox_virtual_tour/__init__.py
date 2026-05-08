"""
NetBox Virtual Tour Plugin

Provides 360-degree virtual tours for Sites and Locations using
PhotoSphereViewer. Editors can author tours with a drag-and-drop
floorplan editor; viewers see a Street View-style experience.

Designed to run both as a NetBox plugin AND as a standalone Django
app for development. The standalone mode is enabled by setting
NETBOX_VIRTUAL_TOUR_STANDALONE = True in Django settings (the
included `standalone/settings.py` sets this automatically).
"""
from django.conf import settings

# Detect whether we're running standalone or inside NetBox.
# This flag controls which Site/Location models we link to.
STANDALONE = getattr(settings, 'NETBOX_VIRTUAL_TOUR_STANDALONE', False)

if STANDALONE:
    default_app_config = 'netbox_virtual_tour.apps.StandaloneAppConfig'
else:
    # NetBox plugin entry point. NetBox discovers plugins by looking
    # for a `config` attribute that subclasses PluginConfig.
    try:
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
    except ImportError:
        # NetBox not installed and not running standalone — likely
        # importing for tooling (migrations, shell, etc). Fall back
        # to the standalone app config.
        default_app_config = 'netbox_virtual_tour.apps.StandaloneAppConfig'
