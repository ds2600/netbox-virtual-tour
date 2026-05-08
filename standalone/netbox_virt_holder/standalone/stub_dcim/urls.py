from django.urls import path

from . import views

app_name = 'stub_dcim'

urlpatterns = [
    path('sites/', views.site_list, name='site_list'),
    path('sites/add/', views.site_create, name='site_create'),
    path('sites/<slug:slug>/', views.site_detail, name='site_detail'),
    path('sites/<slug:site_slug>/locations/add/',
         views.location_create, name='location_create'),
    path('sites/<slug:site_slug>/locations/<slug:slug>/',
         views.location_detail, name='location_detail'),
]
