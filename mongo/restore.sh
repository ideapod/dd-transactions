#!/bin/bash
# Runs once on first container start (when data volume is empty).
# --noOptionsRestore skips the DocumentDB-specific storageEngine metadata.
mongorestore --noOptionsRestore /dump
