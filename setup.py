# -*- coding: utf-8 -*-
from setuptools import setup, find_packages

with open('requirements.txt') as f:
	install_requires = f.read().strip().split('\n')

# get version from __version__ variable in simplified_production/__init__.py
from simplified_production import __version__ as version

setup(
	name='simplified_production',
	version=version,
	description='xyz',
	author='xyz',
	author_email='xyz',
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
