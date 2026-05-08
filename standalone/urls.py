from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.shortcuts import redirect
from django.urls import include, path

urlpatterns = [
    path('', lambda r: redirect('stub_dcim:site_list')),
    path('admin/', admin.site.urls),
    path('dcim/', include('stub_dcim.urls')),
    path('plugins/virtual-tour/',
         include('netbox_virtual_tour.urls', namespace='netbox_virtual_tour')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
