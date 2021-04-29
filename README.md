# GitHub Action to Release Code for Foundry Systems and Modules

This github action seeks to enable a simple release process where you just tag your code with 'vxx.xx.xx', and this action does the rest.

The steps are:

* Create a release branch
* Perform version substitution on the system.json or manifest.json
* Create a release
* Output the URL to the manifest for copy/paste into the Foundry admin interface


Goals:
* Don't have extraneous files in the release
* Don't have extraneous files in the zip
* Perhaps do a pre-release in the automated process?
