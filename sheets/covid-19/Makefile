SHELL=/bin/bash
.EXPORT_ALL_VARIABLES:
.SHELLFLAGS = -uec -o pipefail

default: help

node_modules: package.json ## install nodejs libs
	npm i
	touch $@

.PHONY:
node: node_modules
	node .

.PHONY: clean
clean: ## Removes all files in the .gitignore
	git clean -fdX

.PHONY: help
help:
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
