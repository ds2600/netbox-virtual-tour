from django.contrib import admin

from .models import VirtualTour


@admin.register(VirtualTour)
class VirtualTourAdmin(admin.ModelAdmin):
    list_display = ('id', 'parent', 'status', 'created', 'last_updated')
    list_filter = ('status',)
    readonly_fields = ('uuid', 'published_data', 'created', 'last_updated')

# Scene and SceneLink are NOT registered with admin.
# They are implementation details managed entirely through the
# plugin's own editor UI. Exposing them in Django admin would
# allow data to be created in a broken state (e.g. scenes without
# photos, links with invalid yaw values).
