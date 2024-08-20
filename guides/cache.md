# Migrate from Heroku Redis to Azure Cache for Redis

> [!WARNING]
> Heroku Redis version 7.2.4 uses RDB version 10, which is not compatible with Azure Redis Cache, which uses version 6.X.X and RDB version 9. Newer versions of Redis can read RDB files created by older versions. For example, Redis 7.0 can read RDB files from Redis 6.0. However, older versions of Redis cannot read RDB files created by newer versions. For example, Redis 6.0 cannot read RDB files from Redis 7.0. If this applies to your situation, **migration will not be possible**.

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

Setup env vars (feel free to change these):

```bash
accountName="herokutoazure"
accountRg="herokutoazure"
containerName="herokutoazure"
blobName="herokutoazure"
location="eastus"
```

1. Create a storage account:

```bash
az group create --name $accountRg --location $location
```

```bash
az storage account create --name $accountName --resource-group $accountRg --location $location --sku Standard_LRS
```

2. Create a storage container:

```bash
az storage container create --name $containerName --account-name $accountName --fail-on-exist
```

### Upload the RDB file to Azure Storage

1. Upload your RDB file to the storage account:

```bash
az storage blob upload --account-name $accountName --container-name $containerName --name $blobName --file dump.rdb
```

2. Set the SAS URL of the blob:

```bash
end=`date -u -d "30 minutes" '+%Y-%m-%dT%H:%MZ'`
sasUrl=$(az storage blob generate-sas --account-name $accountName --container-name $containerName --name $blobName --permissions r --expiry $end --full-uri --output tsv)
```

_Set an expiry date for the SAS URL to ensure that the data is not accessible after the migration._

### Import data from Azure storage to Azure Cache for Redis

Setup env vars (feel free to change these):

```bash
cacheRg="herokutoazure"
cacheName="herokutoazure"
```

Run the following command to import the data from Azure Storage to Azure Cache for Redis:

**Premium tier**:

```bash
az redis import --name $cacheName --resource-group $cacheRg --files $sasUrl
```

**Enterprise tier**:

```bash
az redisenterprise database import --cluster-name $cacheName --resource-group $cacheRg --sas-uris $sasUrl
```

## Sources

- [Import data into Azure Cache Redis](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-import-export-data)
