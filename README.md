# NetBox Virtual Tour Plugin

360-degree virtual tours for NetBox Sites and Locations, built on
[PhotoSphereViewer](https://photo-sphere-viewer.js.org/) with the
VirtualTour, Markers, and Map plugins.

Editors author tours through a drag-and-drop floorplan UI. Viewers
get a Street View-style experience with a minimap that shows their
current position and facing direction.

## Status

**Pre-alpha.** Architecture is in place; needs end-to-end browser
testing of the editor flows.

## Quick start (standalone)

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
- Drag-and-drop floorplan editor
- Export tour as a portable zip bundle

## Tech stack

- Python 3.10+, Django 4.2 LTS
- Pillow for image dimension reading
- Vanilla JS in the editor 
- PhotoSphereViewer 5.13.3 
- SQLite for standalone dev; PostgreSQL via NetBox in production

## License

Apache 2.0.
