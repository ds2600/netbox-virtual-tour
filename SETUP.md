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
