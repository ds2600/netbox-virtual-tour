"""Minimal stub models for standalone development.

These mimic NetBox's dcim.Site and dcim.Location just enough to
exercise the plugin. When porting to NetBox, the plugin's
GenericForeignKey will point at the real dcim models instead and
this stub app is no longer installed.
"""
from django.db import models
from django.urls import reverse


class Site(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return reverse('stub_dcim:site_detail', kwargs={'slug': self.slug})


class Location(models.Model):
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name='locations')
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100)
    description = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ['site', 'name']
        unique_together = [('site', 'slug')]

    def __str__(self):
        return f'{self.site.name} / {self.name}'

    def get_absolute_url(self):
        return reverse(
            'stub_dcim:location_detail',
            kwargs={'site_slug': self.site.slug, 'slug': self.slug},
        )
