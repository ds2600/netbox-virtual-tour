"""
NetBox template extensions.

Injects the Virtual Tour CTA into the right-hand panel of Site and
Location detail pages. NetBox discovers this file automatically via
the PluginConfig — no registration needed beyond listing the module
in __init__.py's config class (which already points at this file
implicitly via the standard NetBox plugin loader).

In NetBox 4.x the import path is netbox.plugins.PluginTemplateExtension.
"""
from django.contrib.contenttypes.models import ContentType

from netbox.plugins import PluginTemplateExtension

from .models import VirtualTour


class _TourCtaMixin:
    """Shared logic for Site and Location detail page extensions."""

    def right_page(self):
        obj = self.context['object']
        ct = ContentType.objects.get_for_model(obj)
        tour = VirtualTour.objects.filter(
            content_type=ct,
            object_id=obj.pk,
        ).first()
        return self.render(
            'netbox_virtual_tour/_tour_cta.html',
            extra_context={
                'tour': tour,
                'tour_parent_ct': ct,
                'tour_parent_id': obj.pk,
            },
        )


class SiteTourCta(_TourCtaMixin, PluginTemplateExtension):
    model = 'dcim.site'


class LocationTourCta(_TourCtaMixin, PluginTemplateExtension):
    model = 'dcim.location'


template_extensions = [SiteTourCta, LocationTourCta]
