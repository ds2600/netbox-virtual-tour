try:
    from netbox.plugins import PluginConfig

    class NetBoxVirtualTourConfig(PluginConfig):
        name = 'netbox_virtual_tour'
        verbose_name = 'NetBox Virtual Tour'
        description = '360-degree virtual tours for Sites and Locations'
        version = '0.1.0'
        author = 'ds2600'
        author_email = 'ds2600@ds2600.com'
        base_url = 'virtual-tour'
        min_version = '4.0.0'
        default_settings = {}

    config = NetBoxVirtualTourConfig

except ImportError:
    pass
