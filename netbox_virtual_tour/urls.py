"""URL routes for the virtual tour plugin.

Mounted at /plugins/virtual-tour/ in NetBox, /plugins/virtual-tour/
in standalone (see standalone/urls.py).

NOTE: No app_name here. In NetBox mode, NetBox's plugin loader sets
the namespace to the plugin's `name` ('netbox_virtual_tour') when it
calls include(). Defining app_name here as well causes a namespace
conflict that produces "not a registered namespace" errors.
In standalone mode, the namespace is set explicitly in standalone/urls.py
via include(..., namespace='netbox_virtual_tour').
"""
from django.urls import path

from . import views

urlpatterns = [
    # Editor entry point — creates a new tour for a Site/Location
    # if none exists, or opens the editor for the existing one.
    path(
        'edit/<str:object_type>/<int:object_id>/',
        views.tour_edit_redirect,
        name='tour_edit_for_object',
    ),

    # Viewer (the public-facing 360 tour).
    path('tour/<int:pk>/', views.tour_view, name='tour_view'),

    # Editor UI.
    path('tour/<int:pk>/edit/', views.tour_edit, name='tour_edit'),

    # Tour API (used by both editor and viewer).
    path('api/tour/<int:pk>/', views.tour_api, name='tour_api'),
    path('api/tour/<int:pk>/floorplan/',
         views.tour_floorplan_upload, name='tour_floorplan_upload'),
    path('api/tour/<int:pk>/publish/',
         views.tour_publish, name='tour_publish'),
    path('api/tour/<int:pk>/export/',
         views.tour_export, name='tour_export'),
    path('api/tour/<int:pk>/delete/',
         views.tour_delete, name='tour_delete'),

    # Scene API.
    path('api/tour/<int:pk>/scene/',
         views.scene_create, name='scene_create'),
    path('api/scene/<int:pk>/',
         views.scene_detail, name='scene_detail'),
    path('api/scene/<int:pk>/delete/',
         views.scene_delete, name='scene_delete'),

    # Scene link API.
    path('api/scene/<int:pk>/link/',
         views.link_create, name='link_create'),
    path('api/link/<int:pk>/delete/',
         views.link_delete, name='link_delete'),
]
