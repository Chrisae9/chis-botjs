#!/usr/bin/env bash
# NPM install if needed
npm_install_needed=""
if [[ ! -d node_modules ]]; then
	npm_install_needed="y"
else
	package_lock_t=$(date -r package-lock.json '+%s')
	package_json_t=$(date -r package.json '+%s')

	if (($package_json_t > $package_lock_t)); then
		npm_install_needed="y"
	fi
fi

if [[ -n "$npm_install_needed" ]]; then
	npm install
fi

# Run watch mode
npm run watch
