# NetBox Virtual Tour Plugin

360-degree virtual tours for NetBox Sites and Locations, built on
[PhotoSphereViewer](https://photo-sphere-viewer.js.org/) with the
VirtualTour, Markers, and Map plugins.

Editors author tours through a drag-and-drop floorplan UI. Viewers
get a Street View-style experience with a minimap that shows their
current position and facing direction.

## Status

**Pre-alpha.** Architecture is in place; needs end-to-end browser
testing of the editor flows. See `SETUP.md` to start poking it.

## Quick start

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Open <http://127.0.0.1:8000/>. Full instructions in **SETUP.md**.

## Documentation

- **[SETUP.md](SETUP.md)** — Get it running locally for development
- **[NETBOX_PORTING.md](NETBOX_PORTING.md)** — How to install on a
  real NetBox instance

## Features

- 360 photo viewer with PhotoSphereViewer 5
- Floorplan minimap with synced compass arrow
- Drag-and-drop floorplan editor — no coding required to author
  tours
- Click-to-set default view direction (no math, no degrees-typing)
- Click-to-place navigation links between scenes
- Draft / Publish workflow — viewers see only published tours
- Export tour as a portable zip bundle
- Independent permissions (`view_virtualtour`, `change_virtualtour`,
  `delete_virtualtour`) — viewers see no broken UI when they lack
  rights, even if a tour is missing

## Tech stack

- Python 3.10+, Django 4.2 LTS
- Pillow for image dimension reading
- Vanilla JS in the editor (no React/Vue build) — keeps the
  NetBox plugin install footprint tiny
- PhotoSphereViewer 5.13.3 (via jsDelivr CDN)
- SQLite for standalone dev; PostgreSQL via NetBox in production

## License

Apache 2.0.
