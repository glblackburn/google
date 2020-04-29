SHELL=/bin/bash
.EXPORT_ALL_VARIABLES:
.SHELLFLAGS = -uec -o pipefail

default: help


../../../COVID-19:
	make clone_covid_data

.PHONY:
clone_covid_data: ## clone COVID-19 data from github.com
	echo "git clone COVID-19 data from github.com"
	cd ../../.. && git clone git@github.com:CSSEGISandData/COVID-19.git

.PHONY:
pull_covid_data: ../../../COVID-19 ## update COVID-19 data from github.com
	echo "git pull COVID-19 data from github.com"
	cd ../../../COVID-19 && git pull

node_modules: package.json ## install nodejs libs
	npm i
	touch $@

.PHONY:
node: ../../../COVID-19 node_modules ## run the node app
	node .

.PHONY: clean
clean: ## Removes all files in the .gitignore
	git clean -fdX

.PHONY: help
help:
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
