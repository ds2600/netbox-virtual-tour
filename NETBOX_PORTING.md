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
pip install git+https://github.com/ds2600/netbox-virtual-tour.git@main
```

## Step 2 — Enable in NetBox config

Edit `/opt/netbox/netbox/netbox/configuration.py`:

```python
PLUGINS = [
    'netbox_virtual_tour',
]

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

## Storage

The plugin uses Django's standard file storage for floorplans and
360 photos. If your NetBox is configured with `STORAGE_BACKEND`
set to S3 (via `django-storages`), uploaded files go to S3
automatically. Otherwise they go to `MEDIA_ROOT`, which on a
default NetBox install is `/opt/netbox/netbox/media/`.

