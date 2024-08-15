# Migrate from Heroku to Azure

## Introduction

Hi there. This is a guide to migrate your Heroku app to Azure. This guide is written for a Node.js app, but the steps are similar for other languages.

## App Migration

Guides for migrating your app to Azure:

- Azure App Service [here](./app.md)
- Azure Kubernetes Service [here](./k8s.md)

## Database Migration

Guides for migrating your database to Azure:

- Azure PostgresQL (private network access only) [here](./database-secure.md)
- Azure PostgresQL (public network access) [here](./database-public.md)

## Cache Migration

Heroku CLI does not support creating backups from the Redis add-on. You can use the `redis-cli` to create a backup and restore it to Azure Redis Cache, and I'll link to a guide I found [here](https://cyounkins.medium.com/getting-a-redis-rdb-dump-out-of-heroku-427b5b4cac49) that creates the backup dump. Then, you can follow the guide to import into Azure Cache Redis [here](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-import-export-data#import).

## CI/CD Pipeline Migration
