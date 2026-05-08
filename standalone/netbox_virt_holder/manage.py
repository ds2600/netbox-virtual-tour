#!/usr/bin/env python
"""Django management script for standalone development."""
import os
import sys


def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'standalone.settings')
    # Add the repo root to sys.path so both the plugin and the
    # standalone package can be imported, and the standalone dir
    # itself so `stub_dcim` is a top-level import.
    here = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, here)
    sys.path.insert(0, os.path.join(here, 'standalone'))
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Did you install requirements.txt?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
