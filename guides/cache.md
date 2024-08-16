# Migrate from Heroku Redis to Azure Cache for Redis

## Prerequisites

- [redis-cli](https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/)
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
- Azure Cache for Redis deployed (**[tier must be Premium, Enterprise, or Enterprise Flash](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-import-export-data#which-tiers-support-importexport)**, example [here](https://github.com/massdriver-cloud/azure-cache-redis))

## Create a backup of Heroku Redis

1. Log into Heroku CLI

```bash
heroku login
```

2. Fetch the Heroku Redis credentials:

```bash
heroku redis:credentials -a <app-name>
```

3. Create a backup of the Heroku Redis instance:

```bash
redis-cli -h <host> -p <port> -a <password> --rdb dump.rdb
```

> [!NOTE]
> If you are using a tier higher than `Mini`, you may need to add `--tls --insecure` to the command.

## Migrate to Azure Cache for Redis

Migrating your cache data into Azure Cache Redis requires the use page or block blobs in Azure Storage.

### Create a storage account

1. Create a storage account:

```bash
az group create --name <resource-group-name> --location <location>
```

```bash
az storage account create --name <storage-account-name> --resource-group <resource-group-name> --location <location> --sku Standard_LRS
```

2. Create a storage container:

```bash
az storage container create --name <container-name> --account-name <storage-account-name> --fail-on-exist --public-access blob
```

### Upload the RDB file to Azure Storage

1. Upload your RDB file to the storage account:

```bash
az storage blob upload --account-name <storage-account-name> --container-name <container-name> --name <blob-name> --file dump.rdb
```

2. Set the SAS URL of the blob:

```bash
sasUrl=$(az storage blob generate-sas --account-name <storage-account-name> --container-name <container-name> --name <blob-name> --permissions r --expiry <YYYY-MM-DDT00:00:00Z> --output tsv)
```

_Set an expiry date for the SAS URL to ensure that the data is not accessible after the migration._

### Import data from Azure storage to Azure Cache for Redis

Run the following command to import the data from Azure Storage to Azure Cache for Redis:

**Premium tier**:

```bash
az redis import --name <cache-name> --resource-group <resource-group-name> --files $sasUrl
```

**Enterprise tier**:

```bash
az redisenterprise database import --cluster-name <cluster-name> --resource-group <resource-group> --sas-uris $sasUrl
```

## Sources

- [Import data into Azure Cache Redis](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-import-export-data)
