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
    # netbox package not installed — running in standalone dev mode.
    # Django will use the AppConfig specified in INSTALLED_APPS
    # ('netbox_virtual_tour.apps.StandaloneAppConfig').
    pass
