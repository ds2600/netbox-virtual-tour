"""End-to-end smoke test for the virtual tour plugin.

Uses Django's test client (not a real browser) so we can verify
the backend flows work without dealing with subprocess management.
This isn't a real test suite — it's a sanity check before
packaging.
"""
import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'standalone'))
os.environ['DJANGO_SETTINGS_MODULE'] = 'standalone.settings'

import django
django.setup()

from django.contrib.auth.models import Permission, User
from django.contrib.contenttypes.models import ContentType
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client
from PIL import Image

from netbox_virtual_tour.models import Scene, SceneLink, VirtualTour
from stub_dcim.models import Location, Site


def fail(msg):
    print(f"\n❌ FAIL: {msg}")
    sys.exit(1)


def ok(msg):
    print(f"  ✓ {msg}")


def make_image_bytes(width=400, height=300, color=(120, 160, 200)):
    """Return PNG bytes of a solid-color image."""
    img = Image.new('RGB', (width, height), color)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf.getvalue()


# ----------------------------------------------------------------------
# Setup
# ----------------------------------------------------------------------
print("\n=== Setup ===")
User.objects.filter(username__in=['editor', 'viewer']).delete()
Site.objects.filter(slug='smoke-hq').delete()

editor = User.objects.create_user('editor', password='editor')
ct = ContentType.objects.get(app_label='netbox_virtual_tour', model='virtualtour')
for codename in ('view_virtualtour', 'add_virtualtour',
                 'change_virtualtour', 'delete_virtualtour'):
    perm = Permission.objects.get(content_type=ct, codename=codename)
    editor.user_permissions.add(perm)
ok("Created editor user with all virtualtour perms")

viewer = User.objects.create_user('viewer', password='viewer')
viewer.user_permissions.add(
    Permission.objects.get(content_type=ct, codename='view_virtualtour')
)
ok("Created viewer user with view_virtualtour only")

site = Site.objects.create(name='Smoke HQ', slug='smoke-hq')
location = Location.objects.create(site=site, name='Lab', slug='lab')
ok(f"Created site={site} and location={location}")


# ----------------------------------------------------------------------
# Editor workflow
# ----------------------------------------------------------------------
print("\n=== Editor workflow ===")
c = Client()
assert c.login(username='editor', password='editor'), 'Editor login failed'
ok("Editor logged in")

# 1. Visit site detail — should see the "Add Virtual Tour" CTA
resp = c.get(f'/dcim/sites/{site.slug}/')
if resp.status_code != 200:
    fail(f"Site detail returned {resp.status_code}")
body = resp.content.decode()
if 'Add Virtual Tour' not in body:
    fail("Editor's site detail page is missing 'Add Virtual Tour' CTA")
ok("Site detail shows 'Add Virtual Tour' for editor")

# 2. Click 'Add Virtual Tour' — creates tour and redirects to editor
site_ct = ContentType.objects.get(app_label='stub_dcim', model='site')
resp = c.get(f'/plugins/virtual-tour/edit/site/{site.pk}/', follow=False)
if resp.status_code != 302:
    fail(f"Tour creation didn't redirect: {resp.status_code}")
tour = VirtualTour.objects.get(content_type=site_ct, object_id=site.pk)
ok(f"Created tour pk={tour.pk}, status={tour.status}")

# 3. Open the editor page itself
resp = c.get(f'/plugins/virtual-tour/tour/{tour.pk}/edit/')
if resp.status_code != 200:
    fail(f"Editor page returned {resp.status_code}")
if 'editor.js' not in resp.content.decode():
    fail("Editor page didn't render expected JS reference")
ok("Editor page renders")

# 4. Upload a floorplan
floorplan_bytes = make_image_bytes(800, 600, color=(220, 220, 220))
resp = c.post(
    f'/plugins/virtual-tour/api/tour/{tour.pk}/floorplan/',
    {'floorplan': SimpleUploadedFile('floorplan.png', floorplan_bytes, 'image/png')},
)
if resp.status_code != 200:
    fail(f"Floorplan upload returned {resp.status_code}: {resp.content[:200]}")
data = resp.json()
if data.get('floorplan_width') != 800 or data.get('floorplan_height') != 600:
    fail(f"Floorplan dimensions wrong: {data}")
ok(f"Floorplan uploaded ({data['floorplan_width']}x{data['floorplan_height']})")

# 5. Upload two scenes (using fake images — content doesn't matter for API tests)
scene_ids = []
for name, color in [('Lobby', (180, 100, 100)), ('Kitchen', (100, 180, 100))]:
    photo_bytes = make_image_bytes(200, 100, color=color)
    resp = c.post(
        f'/plugins/virtual-tour/api/tour/{tour.pk}/scene/',
        {
            'photo': SimpleUploadedFile(f'{name}.jpg', photo_bytes, 'image/jpeg'),
            'name': name,
        },
    )
    if resp.status_code != 200:
        fail(f"Scene upload returned {resp.status_code}: {resp.content[:200]}")
    scene_ids.append(resp.json()['id'])
    ok(f"Created scene '{name}' (id={resp.json()['id']})")

# 6. Update a scene's position and rotation (simulate drag/rotate)
resp = c.post(
    f'/plugins/virtual-tour/api/scene/{scene_ids[0]}/',
    data=json.dumps({
        'floorplan_x': 0.25,
        'floorplan_y': 0.75,
        'floorplan_rotation': 45.0,
        'default_yaw': 1.5,
        'default_pitch': -0.1,
    }),
    content_type='application/json',
)
if resp.status_code != 200:
    fail(f"Scene update returned {resp.status_code}")
scene = Scene.objects.get(pk=scene_ids[0])
if scene.floorplan_x != 0.25 or scene.floorplan_rotation != 45.0:
    fail(f"Scene update didn't persist: x={scene.floorplan_x}, rot={scene.floorplan_rotation}")
ok(f"Scene update persisted: x={scene.floorplan_x}, rotation={scene.floorplan_rotation}°")

# 7. Add a link from scene 0 to scene 1
resp = c.post(
    f'/plugins/virtual-tour/api/scene/{scene_ids[0]}/link/',
    data=json.dumps({'to_scene_id': scene_ids[1], 'yaw': 0.5, 'pitch': 0.0}),
    content_type='application/json',
)
if resp.status_code != 200:
    fail(f"Link create returned {resp.status_code}: {resp.content[:200]}")
link_id = resp.json()['id']
ok(f"Created link {scene_ids[0]} → {scene_ids[1]} (link id={link_id})")

# 8. Fetch the tour API — editor should see the live state
resp = c.get(f'/plugins/virtual-tour/api/tour/{tour.pk}/')
if resp.status_code != 200:
    fail(f"Tour API returned {resp.status_code}")
data = resp.json()
if len(data['scenes']) != 2 or len(data['scenes'][0]['links']) != 1:
    fail(f"Tour API data incomplete: {data}")
ok(f"Tour API returns {len(data['scenes'])} scenes, {len(data['scenes'][0]['links'])} link")

# 9. Tour is still draft — viewer should not see it yet
viewer_client = Client()
viewer_client.login(username='viewer', password='viewer')
resp = viewer_client.get(f'/dcim/sites/{site.slug}/')
if 'Open Virtual Tour' in resp.content.decode():
    fail("Draft tour visible to viewer — should be hidden")
if 'Add Virtual Tour' in resp.content.decode():
    fail("Viewer sees 'Add Virtual Tour' CTA — should not")
ok("Viewer correctly sees no tour UI while tour is draft")

resp = viewer_client.get(f'/plugins/virtual-tour/tour/{tour.pk}/')
if resp.status_code != 404:
    fail(f"Viewer accessing draft tour got {resp.status_code}, expected 404")
ok("Viewer accessing draft tour gets 404")

# 10. Publish
resp = c.post(f'/plugins/virtual-tour/api/tour/{tour.pk}/publish/')
if resp.status_code != 200:
    fail(f"Publish returned {resp.status_code}")
tour.refresh_from_db()
if not tour.is_published:
    fail("Tour didn't get marked published")
if not tour.published_data or len(tour.published_data['scenes']) != 2:
    fail(f"published_data not populated correctly: {tour.published_data}")
ok(f"Tour published (snapshot has {len(tour.published_data['scenes'])} scenes)")

# 11. Now viewer should see the tour link
resp = viewer_client.get(f'/dcim/sites/{site.slug}/')
if 'Open Virtual Tour' not in resp.content.decode():
    fail("Published tour not visible to viewer")
ok("Viewer now sees 'Open Virtual Tour' button")

resp = viewer_client.get(f'/plugins/virtual-tour/tour/{tour.pk}/')
if resp.status_code != 200:
    fail(f"Viewer can't access published tour: {resp.status_code}")
ok("Viewer can open the published tour")

# 12. Export as zip
resp = c.get(f'/plugins/virtual-tour/api/tour/{tour.pk}/export/')
if resp.status_code != 200:
    fail(f"Export returned {resp.status_code}")
if resp['Content-Type'] != 'application/zip':
    fail(f"Export wrong content-type: {resp['Content-Type']}")
import zipfile
zf = zipfile.ZipFile(io.BytesIO(resp.content))
names = zf.namelist()
if 'tour.json' not in names:
    fail(f"Export missing tour.json: {names}")
manifest = json.loads(zf.read('tour.json'))
if len(manifest['scenes']) != 2:
    fail(f"Export manifest scenes count wrong: {manifest}")
ok(f"Export bundle contains {len(names)} files: {names}")

# 13. Permission check: viewer should not be able to edit
resp = viewer_client.get(f'/plugins/virtual-tour/tour/{tour.pk}/edit/')
if resp.status_code not in (403, 302):
    fail(f"Viewer accessing editor got {resp.status_code}, expected 403 or redirect")
ok(f"Viewer denied access to editor (status {resp.status_code})")

# 14. Anonymous user should see nothing tour-related
anon = Client()
resp = anon.get(f'/dcim/sites/{site.slug}/')
body = resp.content.decode()
if 'Virtual Tour' in body and 'Open Virtual Tour' in body:
    fail("Anonymous user can see tour link — should not")
ok("Anonymous user sees no tour UI")

# 15. Delete a link
resp = c.post(f'/plugins/virtual-tour/api/link/{link_id}/delete/')
if resp.status_code != 200:
    fail(f"Link delete returned {resp.status_code}")
if SceneLink.objects.filter(pk=link_id).exists():
    fail("Link wasn't actually deleted")
ok("Link deleted")

# 16. Delete a scene
resp = c.post(f'/plugins/virtual-tour/api/scene/{scene_ids[1]}/delete/')
if resp.status_code != 200:
    fail(f"Scene delete returned {resp.status_code}")
if Scene.objects.filter(pk=scene_ids[1]).exists():
    fail("Scene wasn't deleted")
ok("Scene deleted")

# 17. Delete the entire tour
resp = c.post(f'/plugins/virtual-tour/api/tour/{tour.pk}/delete/')
if resp.status_code != 200:
    fail(f"Tour delete returned {resp.status_code}")
if VirtualTour.objects.filter(pk=tour.pk).exists():
    fail("Tour wasn't deleted")
ok("Tour deleted")

print("\n✅ All smoke tests passed.\n")
