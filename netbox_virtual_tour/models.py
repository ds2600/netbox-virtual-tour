"""
Data models for virtual tours.

A VirtualTour is attached to either a Site or a Location via a
GenericForeignKey. Each tour has many Scenes (one per 360 photo)
and Scenes have SceneLinks pointing to other Scenes.

Tours have a draft/published distinction: editors mutate the live
rows freely, but viewers only ever see `published_data` — a JSON
snapshot of the tour as it looked when "Publish" was last clicked.
"""
import os
import uuid

from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.urls import reverse


def _scene_photo_path(instance, filename):
    """Store photos under a per-tour UUID directory."""
    ext = os.path.splitext(filename)[1].lower()
    return f'virtual_tour/{instance.tour.uuid}/scenes/{uuid.uuid4().hex}{ext}'


def _floorplan_path(instance, filename):
    ext = os.path.splitext(filename)[1].lower()
    return f'virtual_tour/{instance.uuid}/floorplan{ext}'


class VirtualTour(models.Model):
    """A tour attached to a Site or Location.

    The (content_type, object_id) pair is unique — at most one tour
    per object. Use a GenericForeignKey so the same model serves
    both Sites and Locations without needing two tables.
    """

    STATUS_DRAFT = 'draft'
    STATUS_PUBLISHED = 'published'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_PUBLISHED, 'Published'),
    ]

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    # Generic relation to either dcim.Site or dcim.Location. In
    # standalone mode these point at the stub models in stub_dcim.
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name='+',
    )
    object_id = models.PositiveIntegerField()
    parent = GenericForeignKey('content_type', 'object_id')

    floorplan = models.ImageField(upload_to=_floorplan_path, blank=True, null=True)
    floorplan_width = models.PositiveIntegerField(default=0)
    floorplan_height = models.PositiveIntegerField(default=0)

    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_DRAFT)

    # JSON snapshot of the tour at last publish. Viewers read this;
    # editors never touch it directly. When status is 'draft' and
    # this is empty, no public tour exists yet.
    published_data = models.JSONField(blank=True, null=True)
    published_at = models.DateTimeField(blank=True, null=True)

    created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('content_type', 'object_id')]
        ordering = ['-last_updated']

    def __str__(self):
        return f'Virtual Tour for {self.parent}'

    @property
    def is_published(self):
        return self.published_data is not None

    def get_absolute_url(self):
        return reverse('plugins:netbox_virtual_tour:tour_view', kwargs={'pk': self.pk})

    def get_editor_url(self):
        return reverse('plugins:netbox_virtual_tour:tour_edit', kwargs={'pk': self.pk})

    def build_published_snapshot(self):
        """Serialize the current state of scenes/links into a
        JSON-friendly dict. This is what gets stored in
        published_data and what the viewer consumes via the API."""
        scenes = []
        for scene in self.scenes.all().prefetch_related('outgoing_links'):
            scenes.append({
                'id': scene.pk,
                'name': scene.name,
                'photo_url': scene.photo.url if scene.photo else None,
                'floorplan_x': scene.floorplan_x,
                'floorplan_y': scene.floorplan_y,
                'floorplan_rotation': scene.floorplan_rotation,
                'default_yaw': scene.default_yaw,
                'default_pitch': scene.default_pitch,
                'order': scene.order,
                'links': [
                    {
                        '_id': link.pk,
                        'to_scene_id': link.to_scene_id,
                        'yaw': link.yaw,
                        'pitch': link.pitch,
                        'label': link.label,
                    }
                    for link in scene.outgoing_links.all()
                ],
            })
        return {
            'tour_id': self.pk,
            'floorplan_url': self.floorplan.url if self.floorplan else None,
            'floorplan_width': self.floorplan_width,
            'floorplan_height': self.floorplan_height,
            'scenes': scenes,
        }


class Scene(models.Model):
    """One 360 photo within a tour."""

    tour = models.ForeignKey(VirtualTour, on_delete=models.CASCADE, related_name='scenes')
    name = models.CharField(max_length=200)
    photo = models.ImageField(upload_to=_scene_photo_path)

    # Position on the floorplan, stored as 0.0-1.0 fractions of
    # floorplan width/height. Storing fractions instead of pixels
    # means the floorplan can be replaced with a different
    # resolution without breaking marker positions.
    floorplan_x = models.FloatField(default=0.5)
    floorplan_y = models.FloatField(default=0.5)

    # Rotation of the marker on the floorplan in degrees (0 = up).
    # This is the "compass alignment" — it tells the minimap which
    # direction in the photo corresponds to "up" on the floorplan.
    floorplan_rotation = models.FloatField(default=0.0)

    # Default camera position when the scene loads, in radians (PSV
    # convention). yaw is horizontal rotation, pitch is vertical.
    default_yaw = models.FloatField(default=0.0)
    default_pitch = models.FloatField(default=0.0)

    order = models.PositiveIntegerField(default=0)

    created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'pk']

    def __str__(self):
        return self.name


class SceneLink(models.Model):
    """A navigation arrow from one Scene to another."""

    from_scene = models.ForeignKey(
        Scene, on_delete=models.CASCADE, related_name='outgoing_links',
    )
    to_scene = models.ForeignKey(
        Scene, on_delete=models.CASCADE, related_name='incoming_links',
    )

    # Direction the arrow appears in the source photo, in radians.
    yaw = models.FloatField(default=0.0)
    pitch = models.FloatField(default=0.0)

    label = models.CharField(max_length=200, blank=True)

    class Meta:
        unique_together = [('from_scene', 'to_scene')]

    def __str__(self):
        return f'{self.from_scene} → {self.to_scene}'
