# Migrating Heroku Postgres to Azure Database for PostgreSQL Flexible Server

This guide will walk you through the steps to migrate a Heroku Postgres database to Azure Database for PostgreSQL Flexible Server.

> [!NOTE]
> While this guide is focused on migrating a Heroku Postgres database, most of the steps can be used to migrate any Heroku-based database to Azure with very little modifications.

## Prerequisites

- Azure PostgreSQL Flexible Server instance up and running
- `psql` installed on your execution environment (more on this later)
- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli#troubleshooting-the-heroku-cli) installed on your execution environment

## Migration

### Capture a backup

1. Open a terminal and run the following command to create a backup of your Heroku Postgres database:

```bash
heroku pg:backups:capture --app <app-name>
```

This command will create a backup of your Heroku Postgres database.
