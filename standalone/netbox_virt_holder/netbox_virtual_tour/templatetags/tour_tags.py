"""
Template tag: {% tour_url 'view_name' pk=x %}

Works in both standalone (namespace: netbox_virtual_tour) and
NetBox (namespace: plugins:netbox_virtual_tour) by trying both.
"""
from django import template
from django.urls import NoReverseMatch, reverse

register = template.Library()


def _tour_reverse(viewname, args=None, kwargs=None):
    """Try NetBox-style namespace first, fall back to standalone."""
    for ns in ('plugins:netbox_virtual_tour', 'netbox_virtual_tour'):
        try:
            return reverse(f'{ns}:{viewname}', args=args, kwargs=kwargs)
        except NoReverseMatch:
            continue
    raise NoReverseMatch(
        f"Could not reverse '{viewname}' under either "
        "'plugins:netbox_virtual_tour' or 'netbox_virtual_tour'"
    )


@register.simple_tag
def tour_url(viewname, **kwargs):
    return _tour_reverse(viewname, kwargs=kwargs or None)
