# Setup — Standalone Development

This is the fastest way to get the plugin running on your machine
for development. It uses SQLite and stub Site/Location models —
no NetBox required.

## Prerequisites

- Python 3.10 or newer
- pip

## Quickstart (5 commands)

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Apply migrations
python manage.py migrate

# 3. Create a superuser (for logging in)
python manage.py createsuperuser

# 4. (Optional) Seed some test sites/locations
python manage.py shell <<'PY'
from stub_dcim.models import Site, Location
s = Site.objects.create(name='Test HQ', slug='test-hq')
Location.objects.create(site=s, name='Server Room A', slug='server-room-a')
Location.objects.create(site=s, name='Lobby', slug='lobby')
print('Seeded.')
PY

# 5. Run the server
python manage.py runserver
```

Open <http://127.0.0.1:8000/> and log in as your superuser. You'll
land on the site list. Click into a site or location, then click
**Add Virtual Tour** to launch the editor.

## What the standalone runner is

`standalone/` is a tiny throwaway Django project that exists only
to host the plugin during development. Its key file is
`standalone/settings.py`, which sets:

```python
NETBOX_VIRTUAL_TOUR_STANDALONE = True
```

That single flag tells the plugin to use `stub_dcim.Site` and
`stub_dcim.Location` instead of `dcim.Site` / `dcim.Location`.
Nothing in the plugin code itself is dev-only.

## File layout

```
.
├── manage.py                        # Django entry point (standalone)
├── requirements.txt                 # Dev dependencies
├── setup.py                         # For installing as a NetBox plugin
├── netbox_virtual_tour/             # ← The actual plugin
│   ├── __init__.py                  # PluginConfig (NetBox) / AppConfig (standalone)
│   ├── apps.py
│   ├── models.py                    # VirtualTour, Scene, SceneLink
│   ├── views.py                     # Editor, viewer, JSON APIs
│   ├── urls.py
│   ├── admin.py
│   ├── migrations/
│   ├── templates/netbox_virtual_tour/
│   │   ├── editor.html
│   │   └── viewer.html
│   └── static/netbox_virtual_tour/
│       ├── js/editor.js
│       └── css/editor.css
└── standalone/                      # ← Throwaway dev shell
    ├── settings.py
    ├── urls.py
    ├── wsgi.py
    ├── templates/                   # Stub Site/Location pages
    │   ├── base.html
    │   └── stub_dcim/
    │       ├── _tour_cta.html       # ← Tour CTA include (port to NetBox extension)
    │       ├── site_list.html
    │       ├── site_detail.html
    │       ├── site_form.html
    │       ├── location_detail.html
    │       └── location_form.html
    └── stub_dcim/                   # Stub Site + Location models
        ├── models.py
        ├── views.py
        └── urls.py
```

## Testing the editor flow

After logging in:

1. **Click into a site** (e.g., "Test HQ")
2. **Click "Add Virtual Tour"** — this creates a draft tour and
   opens the editor.
3. **Upload a floorplan** in the left sidebar. PNG or JPG.
4. **Upload a 360 photo** ("+ Add Scene"). It will appear in the
   scene list and a marker will appear on the floorplan.
5. **Drag the marker** to where the photo was taken on the
   floorplan.
6. **Rotate the marker** by grabbing the small white circle that
   appears above it on hover. Point the marker's triangle in the
   direction the photo "faces" so the minimap compass works.
7. **Click the scene** in the list to open it in PhotoSphereViewer.
8. **Pan to the desired starting view** and click "Set Default
   View".
9. **Pan to a doorway** and click "Add Link Here", then pick which
   scene the doorway leads to.
10. **Click Publish** when ready. Viewers will now see the tour
    when they visit the site/location.

## Permissions

In standalone mode the superuser has all permissions automatically.
To test the viewer-only experience:

```bash
python manage.py createsuperuser  # only if you don't have one
python manage.py shell <<'PY'
from django.contrib.auth.models import User, Group, Permission
from django.contrib.contenttypes.models import ContentType

# Create a viewer-only user.
u = User.objects.create_user('viewer', 'viewer@example.com', 'viewer')
ct = ContentType.objects.get(app_label='netbox_virtual_tour', model='virtualtour')
view_perm = Permission.objects.get(content_type=ct, codename='view_virtualtour')
u.user_permissions.add(view_perm)
print('Created viewer-only user: viewer / viewer')
PY
```

Log out and log back in as `viewer`. You'll only see the tour link
on sites/locations where a tour is *published*, and you won't see
"Add Virtual Tour" anywhere.

## Where uploaded files live

Uploads go to `standalone/media/virtual_tour/<tour-uuid>/`. To
reset everything, delete `standalone/db.sqlite3` and
`standalone/media/`.

## Troubleshooting

**"No module named 'stub_dcim'"** — `manage.py` adds `standalone/`
to `sys.path` automatically. If you're running Django commands
some other way, make sure `standalone/` is on `PYTHONPATH`.

**360 photo upload returns 413 Request Entity Too Large** —
`DATA_UPLOAD_MAX_MEMORY_SIZE` is bumped to 100 MB in standalone
settings. If your photos are bigger, raise it.

**PhotoSphereViewer shows a blank black box** — open browser
devtools. Most likely an import-map / CDN issue. The pinned
version is 5.13.3; if jsDelivr is having a bad day try unpkg by
editing the import maps in `editor.html` and `viewer.html`.

**The marker won't drag** — check the browser console. If you see
"pointer-events" errors, the floorplan image hasn't fully loaded
yet; reload the page.
