import io
import json
import os
import zipfile
from datetime import datetime, timezone

from django.contrib.auth.decorators import permission_required
from django.contrib.contenttypes.models import ContentType
from django.http import Http404, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_http_methods, require_POST
from PIL import Image

from .models import Scene, SceneLink, VirtualTour


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

def _require_login(view_func):
    from functools import wraps
    from django.core.exceptions import PermissionDenied
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            raise PermissionDenied
        return view_func(request, *args, **kwargs)
    return wrapper


def _can_view(user, tour):
    if not user.has_perm('netbox_virtual_tour.view_virtualtour'):
        return False
    return tour.is_published or _can_edit(user, tour)


def _can_edit(user, tour):
    return user.has_perm('netbox_virtual_tour.change_virtualtour')


def _resolve_object_type(object_type):
    object_type = object_type.lower()
    if object_type not in ('site', 'location'):
        raise Http404('Invalid object type')
    for app_label in ('dcim', 'stub_dcim'):
        try:
            return ContentType.objects.get(app_label=app_label, model=object_type)
        except ContentType.DoesNotExist:
            continue
    raise Http404('Object type not registered')


def _plugin_base():
    """Return the URL base for the plugin — works in both NetBox and standalone."""
    return '/plugins/virtual-tour'


def _tour_urls(tour):
    """Build all editor URLs as plain strings. No reverse() needed."""
    base = _plugin_base()
    return {
        'data_url':          f'{base}/api/tour/{tour.pk}/',
        'url_floorplan':     f'{base}/api/tour/{tour.pk}/floorplan/',
        'url_scene_create':  f'{base}/api/tour/{tour.pk}/scene/',
        'url_publish':       f'{base}/api/tour/{tour.pk}/publish/',
        'url_export':        f'{base}/api/tour/{tour.pk}/export/',
        'url_delete_tour':   f'{base}/api/tour/{tour.pk}/delete/',
        'url_scene_base':    f'{base}/api/scene/',
        'url_link_base':     f'{base}/api/scene/',
        'url_link_del_base': f'{base}/api/link/',
        'url_back':          tour.parent.get_absolute_url() if tour.parent else '/',
        'url_view':          f'{base}/tour/{tour.pk}/',
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

@_require_login
@permission_required('netbox_virtual_tour.change_virtualtour', raise_exception=True)
def tour_edit_redirect(request, object_type, object_id):
    ct = _resolve_object_type(object_type)
    model_class = ct.model_class()
    get_object_or_404(model_class, pk=object_id)
    tour, _created = VirtualTour.objects.get_or_create(
        content_type=ct, object_id=object_id,
    )
    return redirect(f'{_plugin_base()}/tour/{tour.pk}/edit/')


# ---------------------------------------------------------------------------
# Viewer
# ---------------------------------------------------------------------------

@_require_login
def tour_view(request, pk):
    tour = get_object_or_404(VirtualTour, pk=pk)
    if not _can_view(request.user, tour):
        raise Http404()
    base = _plugin_base()
    return render(request, 'netbox_virtual_tour/viewer.html', {
        'tour': tour,
        'can_edit': _can_edit(request.user, tour),
        'data_url': f'{base}/api/tour/{tour.pk}/',
        'url_edit': f'{base}/tour/{tour.pk}/edit/',
        'url_back': tour.parent.get_absolute_url() if tour.parent else '/',
    })


# ---------------------------------------------------------------------------
# Editor
# ---------------------------------------------------------------------------

@_require_login
@permission_required('netbox_virtual_tour.change_virtualtour', raise_exception=True)
def tour_edit(request, pk):
    tour = get_object_or_404(VirtualTour, pk=pk)
    ctx = {'tour': tour}
    ctx.update(_tour_urls(tour))
    return render(request, 'netbox_virtual_tour/editor.html', ctx)


# ---------------------------------------------------------------------------
# Tour APIs
# ---------------------------------------------------------------------------

@_require_login
def tour_api(request, pk):
    tour = get_object_or_404(VirtualTour, pk=pk)
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
    try:
        img = Image.open(f)
        width, height = img.size
        img.verify()
    except Exception:
        return JsonResponse({'error': 'Invalid image file'}, status=400)
    f.seek(0)
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
    tour.published_data = tour.build_published_snapshot()
    tour.status = VirtualTour.STATUS_PUBLISHED
    tour.published_at = datetime.now(timezone.utc)
    tour.save()
    return JsonResponse({'status': 'published', 'published_at': tour.published_at.isoformat()})


@_require_login
@permission_required('netbox_virtual_tour.delete_virtualtour', raise_exception=True)
@require_POST
def tour_delete(request, pk):
    tour = get_object_or_404(VirtualTour, pk=pk)
    parent_url = tour.parent.get_absolute_url() if tour.parent else '/'
    tour.delete()
    return JsonResponse({'redirect': parent_url})


@_require_login
@permission_required('netbox_virtual_tour.view_virtualtour', raise_exception=True)
def tour_export(request, pk):
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
                    {'_id': link.pk, 'to_scene_id': link.to_scene_id,
                     'yaw': link.yaw, 'pitch': link.pitch, 'label': link.label}
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
    scene = Scene.objects.create(
        tour=tour, name=name, photo=photo,
        floorplan_x=0.5, floorplan_y=0.5, order=tour.scenes.count(),
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
    scene = get_object_or_404(Scene, pk=pk)
    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
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
