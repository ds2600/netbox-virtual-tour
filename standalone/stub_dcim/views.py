"""Views for the stub Site/Location pages. These render a minimal
HTML page that mimics what a NetBox detail page looks like, with
a 'Virtual Tour' link injected when one exists or the user can
edit. In real NetBox this is done via a template extension.
"""
from django.contrib.contenttypes.models import ContentType
from django.shortcuts import get_object_or_404, redirect, render

from netbox_virtual_tour.models import VirtualTour

from .models import Location, Site


def _tour_context(obj):
    """Return context for the Virtual Tour UI block on a detail
    page. Returns the dict the template needs; the template decides
    what (if anything) to render based on permissions and tour
    existence."""
    ct = ContentType.objects.get_for_model(obj)
    tour = VirtualTour.objects.filter(content_type=ct, object_id=obj.pk).first()
    return {
        'tour': tour,
        'tour_parent_ct': ct,
        'tour_parent_id': obj.pk,
    }


def site_list(request):
    sites = Site.objects.all()
    return render(request, 'stub_dcim/site_list.html', {'sites': sites})


def site_detail(request, slug):
    site = get_object_or_404(Site, slug=slug)
    ctx = {'site': site, **_tour_context(site)}
    return render(request, 'stub_dcim/site_detail.html', ctx)


def site_create(request):
    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        slug = request.POST.get('slug', '').strip()
        if name and slug:
            Site.objects.create(name=name, slug=slug,
                                description=request.POST.get('description', ''))
            return redirect('stub_dcim:site_list')
    return render(request, 'stub_dcim/site_form.html')


def location_detail(request, site_slug, slug):
    location = get_object_or_404(Location, site__slug=site_slug, slug=slug)
    ctx = {'location': location, **_tour_context(location)}
    return render(request, 'stub_dcim/location_detail.html', ctx)


def location_create(request, site_slug):
    site = get_object_or_404(Site, slug=site_slug)
    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        slug = request.POST.get('slug', '').strip()
        if name and slug:
            Location.objects.create(
                site=site, name=name, slug=slug,
                description=request.POST.get('description', ''),
            )
            return redirect('stub_dcim:site_detail', slug=site.slug)
    return render(request, 'stub_dcim/location_form.html', {'site': site})
