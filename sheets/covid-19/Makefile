SHELL=/bin/bash
.EXPORT_ALL_VARIABLES:
.SHELLFLAGS = -uec -o pipefail

CONFIG_JSON = "config.json"
COVID19_DATA_GIT := $(shell jq -r .covid19DataGit ${CONFIG_JSON})
COVID19_DATA_PATH := $(shell jq -r .covid19DataPath ${CONFIG_JSON})
SPREADSHEET_ID := $(shell jq -r .spreadsheetId ${CONFIG_JSON})

default: help

.PHONY:
install-jq: ## install jq see: https://stedolan.github.io/jq/
	brew install jq

.PHONY:
setup: install-jq ## install external apps needed to build and run

.PHONY:
${COVID19_DATA_PATH}:
	make clone_covid_data

.PHONY:
clone_covid_data: jq ## clone COVID-19 data from github.com
	echo "git clone COVID-19 data from github.com"
	echo "COVID19_DATA_GIT=[${COVID19_DATA_GIT}]"
	cd $(shell dirname ${COVID19_DATA_PATH}) && git clone ${COVID19_DATA_GIT} $(shell basename ${COVID19_DATA_PATH})

.PHONY:
covid_data: ${COVID19_DATA_PATH}

.PHONY:
pull_covid_data: covid_data ## update COVID-19 data from github.com
	echo "git pull COVID-19 data from github.com"
	cd ${COVID19_DATA_PATH} && git pull

node_modules: package.json ## install nodejs libs
	npm i
	touch $@

.PHONY:
run: pull_covid_data node_modules ## run the node app
	node .

/usr/local/bin/jq:
	echo "need to install jq"
	brew install jq

jq: /usr/local/bin/jq

.PHONY:
open-sheet: jq ## open google sheet in browser
	open https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}

.PHONY: clean
clean: ## Removes all files in the .gitignore
	git clean -fdX

.PHONY: help
help:
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
