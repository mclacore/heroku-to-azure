# Migrating Heroku Postgres to Azure Database for PostgreSQL Flexible Server

This guide will walk you through the steps to migrate a Heroku Postgres database to Azure Database for PostgreSQL Flexible Server.

> [!NOTE]
> While this guide is focused on migrating a Heroku Postgres database, most of the steps can be used to migrate any Heroku-based database to Azure with very little modifications.

## Prerequisites

- Azure PostgreSQL Flexible Server instance up and running
- [psql client](https://www.postgresql.org/download/)
- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli#troubleshooting-the-heroku-cli)

## Migration

### Capture a backup

1. Log into Heroku CLI using:

```bash
heroku login
```

2. Create a backup of your Heroku Postgres database:

```bash
heroku pg:backups:capture --app <app-name>
```

### Download the backup

1. Download the backup from Heroku:

```bash
heroku pg:backups:download --app <app-name>
```

_This will download a file named `latest.dump` to your current directory._

### Restore the backup

1. Restore the backup to your Azure Database for PostgreSQL Flexible Server:

```bash
pg_restore --verbose --no-owner -h <server-name>.postgres.database.azure.com -U <username> -d <database-name> latest.dump
```

2. Confirm the data has been restored:

```bash
psql -h <server-name>.postgres.database.azure.com -U <username> -d <database-name> -c \dt
```
