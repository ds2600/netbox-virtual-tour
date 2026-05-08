"""
python manage.py dev_reset

Wipes the SQLite database and all uploaded media, re-runs migrations,
and optionally creates a superuser and seed data. Useful during
development when you want a completely clean slate.

ONLY works in standalone mode (NETBOX_VIRTUAL_TOUR_STANDALONE=True).
Will refuse to run against a real database to prevent accidents.
"""
import os
import shutil

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Reset the dev environment: wipe DB + media, re-migrate, seed data.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--no-seed', action='store_true',
            help='Skip creating the default superuser and test sites.',
        )
        parser.add_argument(
            '--yes', action='store_true',
            help='Skip confirmation prompt.',
        )

    def handle(self, *args, **options):
        if not getattr(settings, 'NETBOX_VIRTUAL_TOUR_STANDALONE', False):
            raise CommandError(
                'dev_reset refuses to run outside standalone mode. '
                'Set NETBOX_VIRTUAL_TOUR_STANDALONE=True in settings.'
            )

        db_path = settings.DATABASES['default']['NAME']
        media_root = settings.MEDIA_ROOT

        if not options['yes']:
            self.stdout.write(self.style.WARNING(
                f'\nThis will DELETE:\n'
                f'  Database: {db_path}\n'
                f'  Media:    {media_root}\n'
            ))
            answer = input('Continue? [y/N] ').strip().lower()
            if answer != 'y':
                self.stdout.write('Aborted.')
                return

        # Wipe DB
        if os.path.exists(db_path):
            os.remove(db_path)
            self.stdout.write(f'Deleted {db_path}')

        # Wipe media
        if os.path.exists(media_root):
            shutil.rmtree(media_root)
            self.stdout.write(f'Deleted {media_root}')

        # Re-migrate
        self.stdout.write('\nRunning migrations...')
        call_command('migrate', verbosity=0)
        self.stdout.write(self.style.SUCCESS('Migrations applied.'))

        if not options['no_seed']:
            self._seed()

        self.stdout.write(self.style.SUCCESS(
            '\nDone! Run: python manage.py runserver'
        ))

    def _seed(self):
        from django.contrib.auth.models import Permission, User
        from django.contrib.contenttypes.models import ContentType

        # Superuser
        user = User.objects.create_superuser('admin', 'admin@example.com', 'admin')
        self.stdout.write(self.style.SUCCESS('Created superuser: admin / admin'))

        # Viewer-only user for testing permissions
        viewer = User.objects.create_user('viewer', 'viewer@example.com', 'viewer')
        ct = ContentType.objects.get(
            app_label='netbox_virtual_tour', model='virtualtour'
        )
        viewer.user_permissions.add(
            Permission.objects.get(content_type=ct, codename='view_virtualtour')
        )
        self.stdout.write(self.style.SUCCESS('Created viewer user:   viewer / viewer'))

        # Test sites and locations
        from stub_dcim.models import Location, Site
        hq = Site.objects.create(
            name='Main Office', slug='main-office',
            description='Primary headquarters location',
        )
        Site.objects.create(
            name='Data Center', slug='data-center',
            description='Colocation facility',
        )
        Location.objects.create(
            site=hq, name='Ground Floor', slug='ground-floor',
            description='Reception, lobby, conference rooms',
        )
        Location.objects.create(
            site=hq, name='Server Room', slug='server-room',
            description='Networking and compute equipment',
        )
        self.stdout.write(self.style.SUCCESS('Created 2 sites, 2 locations.'))
        self.stdout.write(
            '\nLog in at http://127.0.0.1:8000/\n'
            '  Editor:  admin  / admin\n'
            '  Viewer:  viewer / viewer\n'
        )
