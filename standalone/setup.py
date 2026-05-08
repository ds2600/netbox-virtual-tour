"""Setup script for installing as a NetBox plugin.

For standalone development, you don't need to install this — just
run `python manage.py runserver` from the repo root after
`pip install -r requirements.txt`.

For NetBox installation, see NETBOX_INSTALL.md.
"""
from setuptools import find_packages, setup

setup(
    name='netbox-virtual-tour',
    version='0.1.0',
    description='360-degree virtual tours for NetBox Sites and Locations',
    author='Your Name',
    license='Apache-2.0',
    install_requires=[
        'Pillow>=10.0',
    ],
    packages=find_packages(exclude=['standalone', 'standalone.*']),
    include_package_data=True,
    zip_safe=False,
)
