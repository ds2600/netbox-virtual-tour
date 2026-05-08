from django.contrib import admin

from .models import Scene, SceneLink, VirtualTour


@admin.register(VirtualTour)
class VirtualTourAdmin(admin.ModelAdmin):
    list_display = ('id', 'parent', 'status', 'created', 'last_updated')
    list_filter = ('status',)
    readonly_fields = ('uuid', 'published_data', 'created', 'last_updated')


@admin.register(Scene)
class SceneAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'tour', 'order')
    list_filter = ('tour',)


@admin.register(SceneLink)
class SceneLinkAdmin(admin.ModelAdmin):
    list_display = ('id', 'from_scene', 'to_scene', 'label')
