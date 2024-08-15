# Migrating Heroku Postgres to Azure Database for PostgreSQL Flexible Server

This guide will walk you through the steps to migrate a Heroku Postgres database to Azure Database for PostgreSQL Flexible Server.

> [!NOTE]
> While this guide is focused on migrating a Heroku Postgres database, most of the steps can be used to migrate any Heroku-based database to Azure with very little modifications.

## Prerequisites

- [psql client](https://www.postgresql.org/download/)
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)

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

1. Log into Azure CLI and set the subscription you want to use:

```bash
az login
```

```bash
az account set --subscription <subscription-id>
```

### Set up the Azure Database for PostgreSQL Flexible Server

1. Create an Azure Database for PostgreSQL Flexible Server:

```bash
az postgres flexible-server create \
  --resource-group <resource-group-name> \
  --name <server-name> \
  --location <location> \
  --admin-user <username> \
  --admin-password <password> \
  --tier GeneralPurpose \
  --sku-name Standard_D2s_v3 \
  --storage-size 128 \
  --version 16 \
  --public-access <your-ip-address>
```

_Modify the values for `version`, `storage-size`, `sku-name`, and `tier` as needed._

2. Fetch the Azure PostgresQL Flexible Server FQDN and username using Azure CLI:

```bash
fqdn=$(az postgres flexible-server show --resource-group <resource-group-name> --name <server-name> --query "fullyQualifiedDomainName" --output tsv)
```

```bash
username=$(az postgres flexible-server show --resource-group <resource-group-name> --name <server-name> --query "administratorLogin" --output tsv)
```

3. Restore the backup to your Azure Database for PostgreSQL Flexible Server:

```bash
pg_restore --verbose --no-owner -h $fqdn -U $username -d <database-name> latest.dump
```

4. Confirm the data has been restored:

```bash
psql -h $fqdn -U $username -d <database-name> -c "\dt"
```
