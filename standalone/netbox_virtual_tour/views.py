"""
Views for the virtual tour plugin.

Three layers:
1. HTML pages: tour_view (the 360 viewer) and tour_edit (the editor)
2. JSON APIs: scene/link CRUD used by the editor's JavaScript
3. Helpers: tour_edit_redirect (creates a tour if missing and
   redirects), tour_export (zip bundle), tour_publish (snapshot)

Permission checks use Django's built-in auth. In NetBox these get
swapped for NetBox's permission decorators, but the underlying
permission codenames (view_virtualtour, change_virtualtour, etc.)
match what NetBox auto-generates.
"""
import io
import json
import os
import zipfile
from datetime import datetime, timezone

from django.contrib.auth.decorators import permission_required
from django.contrib.contenttypes.models import ContentType
from django.core.files.base import ContentFile
from django.http import (
    Http404, HttpResponse, JsonResponse,
)
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_http_methods, require_POST
from PIL import Image

from .models import Scene, SceneLink, VirtualTour


def _tour_reverse(viewname, **kwargs):
    """Reverse a URL in either NetBox ('plugins:netbox_virtual_tour:x')
    or standalone ('netbox_virtual_tour:x') mode."""
    from django.urls import NoReverseMatch
    for ns in ('plugins:netbox_virtual_tour', 'netbox_virtual_tour'):
        try:
            return reverse(f'{ns}:{viewname}', kwargs=kwargs or None)
        except NoReverseMatch:
            continue
    raise NoReverseMatch(f"Cannot reverse '{viewname}' in any known namespace")


# ---------------------------------------------------------------------------
# Auth helper
# ---------------------------------------------------------------------------

def _require_login(view_func):
    """Replacement for @login_required that works in both NetBox and
    standalone. NetBox uses /login/ not /accounts/login/, so we raise
    a 403 for unauthenticated requests and let NetBox's middleware handle
    the redirect. In standalone the admin login handles it."""
    from functools import wraps
    from django.core.exceptions import PermissionDenied

    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            raise PermissionDenied
        return view_func(request, *args, **kwargs)
    return wrapper


# ---------------------------------------------------------------------------
# Permission helpers
# ---------------------------------------------------------------------------

def _can_view(user, tour):
    """Viewers need view permission and the tour must be published."""
    if not user.has_perm('netbox_virtual_tour.view_virtualtour'):
        return False
    return tour.is_published or _can_edit(user, tour)


def _can_edit(user, tour):
    return user.has_perm('netbox_virtual_tour.change_virtualtour')


def _resolve_object_type(object_type):
    """Map the URL's object_type slug ('site' or 'location') to a
    ContentType. Works in both standalone and NetBox modes by
    looking up by model name."""
    object_type = object_type.lower()
    if object_type not in ('site', 'location'):
        raise Http404('Invalid object type')
    # Try NetBox's dcim app first, fall back to stub_dcim.
    for app_label in ('dcim', 'stub_dcim'):
        try:
            return ContentType.objects.get(app_label=app_label, model=object_type)
        except ContentType.DoesNotExist:
            continue
    raise Http404('Object type not registered')


# ---------------------------------------------------------------------------
# Entry point — link from Site/Location detail pages
# ---------------------------------------------------------------------------

@_require_login
@permission_required('netbox_virtual_tour.change_virtualtour', raise_exception=True)
def tour_edit_redirect(request, object_type, object_id):
    """Get-or-create a tour for the given object, then redirect to
    the editor. This is what the 'Add Virtual Tour' button on a
    Site/Location detail page hits."""
    ct = _resolve_object_type(object_type)
    # Validate that the referenced object actually exists.
    model_class = ct.model_class()
    get_object_or_404(model_class, pk=object_id)

    tour, _created = VirtualTour.objects.get_or_create(
        content_type=ct, object_id=object_id,
    )
    return redirect(_tour_reverse('tour_edit', pk=tour.pk))


# ---------------------------------------------------------------------------
# Viewer
# ---------------------------------------------------------------------------

@_require_login
def tour_view(request, pk):
    tour = get_object_or_404(VirtualTour, pk=pk)
    if not _can_view(request.user, tour):
        raise Http404()
    return render(request, 'netbox_virtual_tour/viewer.html', {
        'tour': tour,
        'can_edit': _can_edit(request.user, tour),
        'data_url': _tour_reverse('tour_api', pk=tour.pk),
    })


# ---------------------------------------------------------------------------
# Editor
# ---------------------------------------------------------------------------

@_require_login
@permission_required('netbox_virtual_tour.change_virtualtour', raise_exception=True)
def tour_edit(request, pk):
    tour = get_object_or_404(VirtualTour, pk=pk)
    base = f'/plugins/virtual-tour'
    return render(request, 'netbox_virtual_tour/editor.html', {
        'tour': tour,
        'data_url': f'{base}/api/tour/{tour.pk}/',
        'url_floorplan': f'{base}/api/tour/{tour.pk}/floorplan/',
        'url_scene_create': f'{base}/api/tour/{tour.pk}/scene/',
        'url_publish': f'{base}/api/tour/{tour.pk}/publish/',
        'url_export': f'{base}/api/tour/{tour.pk}/export/',
        'url_delete_tour': f'{base}/api/tour/{tour.pk}/delete/',
        'url_scene_base': f'{base}/api/scene/',
        'url_link_base': f'{base}/api/scene/',
        'url_link_delete_base': f'{base}/api/link/',
    })


# ---------------------------------------------------------------------------
# Tour-level APIs
# ---------------------------------------------------------------------------

@_require_login
def tour_api(request, pk):
    """Return the tour data as JSON. Used by both editor (live
    state) and viewer (published snapshot)."""
    tour = get_object_or_404(VirtualTour, pk=pk)

    # If the caller has edit perms, give them the LIVE data.
    # Otherwise give them the published snapshot, or 404.
    if _can_edit(request.user, tour):
        data = tour.build_published_snapshot()
        data['status'] = tour.status
        data['is_draft'] = not tour.is_published
        return JsonResponse(data)

    if not _can_view(request.user, tour):
        raise Http404()
    if not tour.is_published:
        raise Http404()
    return JsonResponse(tour.published_data)


@_require_login
@permission_required('netbox_virtual_tour.change_virtualtour', raise_exception=True)
@require_POST
def tour_floorplan_upload(request, pk):
    tour = get_object_or_404(VirtualTour, pk=pk)
    f = request.FILES.get('floorplan')
    if not f:
        return JsonResponse({'error': 'No file provided'}, status=400)
    # Read width/height for accurate marker placement.
    try:
        img = Image.open(f)
        width, height = img.size
        img.verify()
    except Exception:
        return JsonResponse({'error': 'Invalid image file'}, status=400)
    f.seek(0)
    # Delete old floorplan to keep media dir tidy.
    if tour.floorplan:
        tour.floorplan.delete(save=False)
    tour.floorplan = f
    tour.floorplan_width = width
    tour.floorplan_height = height
    tour.save()
    return JsonResponse({
        'floorplan_url': tour.floorplan.url,
        'floorplan_width': width,
        'floorplan_height': height,
    })


@_require_login
@permission_required('netbox_virtual_tour.change_virtualtour', raise_exception=True)
@require_POST
def tour_publish(request, pk):
    tour = get_object_or_404(VirtualTour, pk=pk)
    snapshot = tour.build_published_snapshot()
    tour.published_data = snapshot
    tour.status = VirtualTour.STATUS_PUBLISHED
    tour.published_at = datetime.now(timezone.utc)
    tour.save()
    return JsonResponse({'status': 'published', 'published_at': tour.published_at.isoformat()})


@_require_login
@permission_required('netbox_virtual_tour.delete_virtualtour', raise_exception=True)
@require_POST
def tour_delete(request, pk):
    tour = get_object_or_404(VirtualTour, pk=pk)
    parent = tour.parent
    parent_url = parent.get_absolute_url() if parent else '/'
    tour.delete()
    return JsonResponse({'redirect': parent_url})


@_require_login
@permission_required('netbox_virtual_tour.view_virtualtour', raise_exception=True)
def tour_export(request, pk):
    """Bundle the entire tour into a zip:
    - tour.json (all metadata)
    - floorplan.{ext}
    - scenes/<scene_id>.{ext}
    """
    tour = get_object_or_404(VirtualTour, pk=pk)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        manifest = {
            'tour_uuid': str(tour.uuid),
            'exported_at': datetime.now(timezone.utc).isoformat(),
            'parent': {
                'type': tour.content_type.model,
                'id': tour.object_id,
                'name': str(tour.parent) if tour.parent else None,
            },
            'floorplan_width': tour.floorplan_width,
            'floorplan_height': tour.floorplan_height,
            'scenes': [],
        }

        if tour.floorplan:
            ext = os.path.splitext(tour.floorplan.name)[1]
            manifest['floorplan_file'] = f'floorplan{ext}'
            with tour.floorplan.open('rb') as src:
                zf.writestr(f'floorplan{ext}', src.read())

        for scene in tour.scenes.all().prefetch_related('outgoing_links'):
            ext = os.path.splitext(scene.photo.name)[1] if scene.photo else '.jpg'
            scene_file = f'scenes/{scene.pk}{ext}'
            if scene.photo:
                with scene.photo.open('rb') as src:
                    zf.writestr(scene_file, src.read())
            manifest['scenes'].append({
                'id': scene.pk,
                'name': scene.name,
                'photo_file': scene_file,
                'floorplan_x': scene.floorplan_x,
                'floorplan_y': scene.floorplan_y,
                'floorplan_rotation': scene.floorplan_rotation,
                'default_yaw': scene.default_yaw,
                'default_pitch': scene.default_pitch,
                'order': scene.order,
                'links': [
                    {
                        'to_scene_id': link.to_scene_id,
                        'yaw': link.yaw,
                        'pitch': link.pitch,
                        'label': link.label,
                    }
                    for link in scene.outgoing_links.all()
                ],
            })

        zf.writestr('tour.json', json.dumps(manifest, indent=2))

    buf.seek(0)
    response = HttpResponse(buf.read(), content_type='application/zip')
    fname = f'virtual_tour_{tour.pk}_{tour.uuid.hex[:8]}.zip'
    response['Content-Disposition'] = f'attachment; filename="{fname}"'
    return response


# ---------------------------------------------------------------------------
# Scene APIs
# ---------------------------------------------------------------------------

@_require_login
@permission_required('netbox_virtual_tour.change_virtualtour', raise_exception=True)
@require_POST
def scene_create(request, pk):
    tour = get_object_or_404(VirtualTour, pk=pk)
    name = request.POST.get('name', '').strip() or 'Untitled Scene'
    photo = request.FILES.get('photo')
    if not photo:
        return JsonResponse({'error': 'No photo provided'}, status=400)
    # Place new scenes at the center of the floorplan by default.
    next_order = (tour.scenes.count())
    scene = Scene.objects.create(
        tour=tour, name=name, photo=photo,
        floorplan_x=0.5, floorplan_y=0.5, order=next_order,
    )
    return JsonResponse({
        'id': scene.pk,
        'name': scene.name,
        'photo_url': scene.photo.url,
        'floorplan_x': scene.floorplan_x,
        'floorplan_y': scene.floorplan_y,
        'floorplan_rotation': scene.floorplan_rotation,
        'default_yaw': scene.default_yaw,
        'default_pitch': scene.default_pitch,
        'order': scene.order,
        'links': [],
    })


@_require_login
@permission_required('netbox_virtual_tour.change_virtualtour', raise_exception=True)
@require_http_methods(['POST'])
def scene_detail(request, pk):
    """Update a scene's metadata. Used for renaming, repositioning
    on the floorplan, setting default view, and rotating the
    compass marker."""
    scene = get_object_or_404(Scene, pk=pk)
    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    # Only allow whitelisted fields.
    for field in ('name', 'floorplan_x', 'floorplan_y', 'floorplan_rotation',
                  'default_yaw', 'default_pitch', 'order'):
        if field in data:
            setattr(scene, field, data[field])
    scene.save()
    return JsonResponse({'ok': True})


@_require_login
@permission_required('netbox_virtual_tour.change_virtualtour', raise_exception=True)
@require_POST
def scene_delete(request, pk):
    scene = get_object_or_404(Scene, pk=pk)
    scene.delete()
    return JsonResponse({'ok': True})


# ---------------------------------------------------------------------------
# Link APIs
# ---------------------------------------------------------------------------

@_require_login
@permission_required('netbox_virtual_tour.change_virtualtour', raise_exception=True)
@require_POST
def link_create(request, pk):
    """pk is the from_scene id."""
    from_scene = get_object_or_404(Scene, pk=pk)
    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    to_scene_id = data.get('to_scene_id')
    if not to_scene_id:
        return JsonResponse({'error': 'to_scene_id required'}, status=400)
    to_scene = get_object_or_404(Scene, pk=to_scene_id, tour=from_scene.tour)
    if to_scene.pk == from_scene.pk:
        return JsonResponse({'error': "Can't link a scene to itself"}, status=400)

    link, created = SceneLink.objects.update_or_create(
        from_scene=from_scene, to_scene=to_scene,
        defaults={
            'yaw': data.get('yaw', 0.0),
            'pitch': data.get('pitch', 0.0),
            'label': data.get('label', ''),
        },
    )
    return JsonResponse({
        'id': link.pk,
        'to_scene_id': link.to_scene_id,
        'yaw': link.yaw,
        'pitch': link.pitch,
        'label': link.label,
        'created': created,
    })


@_require_login
@permission_required('netbox_virtual_tour.change_virtualtour', raise_exception=True)
@require_POST
def link_delete(request, pk):
    link = get_object_or_404(SceneLink, pk=pk)
    link.delete()
    return JsonResponse({'ok': True})
