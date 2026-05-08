# NetBox Porting Guide

When you're ready to install this on a real NetBox instance, this
is the checklist. The plugin code itself doesn't change much —
most of the work is in deployment and the template hooks.

Tested target: **NetBox 4.x**.

## Step 1 — Install the plugin

On the NetBox server (inside the NetBox virtualenv):

```bash
cd /opt/netbox
source venv/bin/activate
pip install /path/to/this/repo
```

Or for a Git-tracked install:

```bash
pip install git+https://your-repo-url.git@main
```

## Step 2 — Enable in NetBox config

Edit `/opt/netbox/netbox/netbox/configuration.py`:

```python
PLUGINS = [
    'netbox_virtual_tour',
]

# (No PLUGINS_CONFIG entry needed — the plugin has no required
# settings.)
```

## Step 3 — Migrate

```bash
cd /opt/netbox/netbox
python manage.py migrate
python manage.py collectstatic --no-input
sudo systemctl restart netbox netbox-rq
```

## Step 4 — Permissions

NetBox auto-creates these permission codenames:

- `netbox_virtual_tour.view_virtualtour`
- `netbox_virtual_tour.add_virtualtour`
- `netbox_virtual_tour.change_virtualtour`
- `netbox_virtual_tour.delete_virtualtour`

In NetBox's permission UI (Admin → Permissions), create permissions
that grant these to the appropriate user/group. The plugin's UI
visibility is keyed on:

- `view_virtualtour` → can see "Open Virtual Tour" links and load
  published tours
- `change_virtualtour` → can see "Add/Edit Virtual Tour", upload
  photos, publish, etc.
- `delete_virtualtour` → can see "Delete Tour"

Per your spec, these are **independent** of Site/Location
permissions. A user with view_site but no view_virtualtour will
not see any tour-related UI on a site detail page.

## Step 5 — Wire up the Site/Location detail page hook

This is the only place the plugin needs to integrate with NetBox's
template system. Create `netbox_virtual_tour/template_content.py`:

```python
from netbox.plugins import PluginTemplateExtension
from django.contrib.contenttypes.models import ContentType

from .models import VirtualTour


class _TourCtaMixin:
    def right_page(self):
        obj = self.context['object']
        ct = ContentType.objects.get_for_model(obj)
        tour = VirtualTour.objects.filter(
            content_type=ct, object_id=obj.pk,
        ).first()
        return self.render('netbox_virtual_tour/_tour_cta.html', extra_context={
            'tour': tour,
            'tour_parent_ct': ct,
            'tour_parent_id': obj.pk,
        })


class SiteTourCta(_TourCtaMixin, PluginTemplateExtension):
    model = 'dcim.site'


class LocationTourCta(_TourCtaMixin, PluginTemplateExtension):
    model = 'dcim.location'


template_extensions = [SiteTourCta, LocationTourCta]
```

Then **move** the file `standalone/templates/stub_dcim/_tour_cta.html`
to `netbox_virtual_tour/templates/netbox_virtual_tour/_tour_cta.html`.
The contents don't need to change.

## Step 6 — (Optional) Navigation menu

If you want a top-level "Virtual Tours" item in NetBox's nav, add
`netbox_virtual_tour/navigation.py`:

```python
from netbox.plugins import PluginMenuButton, PluginMenuItem

menu_items = (
    PluginMenuItem(
        link='netbox_virtual_tour:tour_list',  # would need to add
        link_text='Virtual Tours',
        permissions=['netbox_virtual_tour.view_virtualtour'],
    ),
)
```

(The `tour_list` view doesn't exist yet — add one if you want a
global index. Tours are reachable from their parent Site/Location
without it.)

## What does NOT change

The following work identically in NetBox and standalone:

- Models, migrations
- All views in `views.py`
- All URLs in `urls.py`
- `editor.html`, `viewer.html`, `editor.js`, `editor.css`
- Permission checks (Django auth perms map 1:1 to NetBox's
  permission codenames)
- The GenericForeignKey on `VirtualTour` — it just resolves to
  `dcim.Site` / `dcim.Location` instead of the stubs

## What you can throw away

After confirming the plugin works in NetBox, you don't need:

- `manage.py`
- `standalone/` (entire directory)
- `setup.py` build artifacts (`build/`, `dist/`, `*.egg-info/`)

You may want to keep `standalone/` around for ongoing development —
it's the fastest way to iterate on plugin changes without poking
a real NetBox install.

## Storage

The plugin uses Django's standard file storage for floorplans and
360 photos. If your NetBox is configured with `STORAGE_BACKEND`
set to S3 (via `django-storages`), uploaded files go to S3
automatically. Otherwise they go to `MEDIA_ROOT`, which on a
default NetBox install is `/opt/netbox/netbox/media/`.

Per your spec, the default (NetBox media directory) is what you
want.

## Things to verify after install

1. Log in as a user with `view_virtualtour` only → confirm no
   "Add Virtual Tour" UI appears anywhere
2. Log in as a user with `change_virtualtour` → confirm "Add
   Virtual Tour" appears on Site and Location pages
3. Create a draft tour with one scene → confirm it does NOT appear
   for plain viewers, but DOES appear for editors with a "(Draft)"
   tag
4. Publish → confirm the same draft is now visible to viewers
5. Test the editor across browsers (Chrome, Firefox, Safari) since
   the drag/rotate uses Pointer Events
6. Test on mobile — PhotoSphereViewer supports gyroscope, so a
   tablet at the site might be a fun way to view tours
