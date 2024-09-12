# Migrate from Heroku Redis to Azure Cache for Redis (secure)

> [!WARNING]
> Heroku Redis version 7.2.4 uses RDB version 10, which is not compatible with Azure Redis Cache, which uses version 6.X.X and RDB version 9. Newer versions of Redis can read RDB files created by older versions. For example, Redis 7.0 can read RDB files from Redis 6.0. However, older versions of Redis cannot read RDB files created by newer versions. For example, Redis 6.0 cannot read RDB files from Redis 7.0. If this applies to your situation, **migration will not be possible**.

## Prerequisites

- [redis-cli](https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/)
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
- Azure Cache for Redis deployed (**[tier must be Premium, Enterprise, or Enterprise Flash](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-import-export-data#which-tiers-support-importexport)**, example [here](https://github.com/massdriver-cloud/azure-cache-redis))
- [Azure Kubernetes Service (AKS)](/guides/k8s.md#create-a-kubernetes-cluster) cluster up and running within the same virtual network as the Azure Cache for Redis instance

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

## Upload backup to Azure Storage Account

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
az login
```

```bash
az account set --subscription <subscription-id>
```

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
# Linux:
end=$(date -u -d "60 minutes" '+%Y-%m-%dT%H:%MZ')

# MacOS:
end=$(date -u -v+60M '+%Y-%m-%dT%H:%MZ')
```

```bash
sasUrl=$(az storage blob generate-sas --account-name $accountName --container-name $containerName --name $blobName --permissions r --expiry $end --full-uri --output tsv)
```

_Set an expiry date for the SAS URL to ensure that the data is not accessible after the migration._

### Set up KUBECONFIG

In order to download the backup, we need to create a temporary pod in AKS and use it as a jump box. Once the backup is downloaded, we will restore the backup to the Azure Cache for Redis, then delete the temporary pod.

1. Install `kubectl` and `kubelogin`:

```bash
az aks install-cli
```

```bash
az aks get-credentials --resource-group <resource-group> --name <aks-cluster-name> --overwrite-existing
```

```bash
kubelogin convert-kubeconfig -l azurecli
```

### Import data from Azure storage to Azure Cache for Redis using AKS

Setup your env vars:

```bash
cacheRg="<resource-group>"
cacheName="<cache-name>"
```

1. Create a new manifest file `haiku-havoc-hero.yaml`:

[haiku-havoc-hero](https://github.com/mclacore/haiku-havoc-hero) provides powerful containers that provide the tools needed to migrate data from Heroku to Azure.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: haiku-havoc-hero
  namespace: default
spec:
  containers:
    - name: redis
      image: mclacore/haiku-havoc-hero:redis-v1
```

2. Deploy the pod:

```bash
kubectl apply -f haiku-havoc-hero.yaml
```

3. Exec into the pod:

```bash
kubectl exec -it haiku-havoc-hero -- /bin/bash
```

4. Run the following command to import the data from Azure Storage to Azure Cache for Redis:

**Premium tier**:

```bash
az redis import --name $cacheName --resource-group $cacheRg --files $sasUrl
```

**Enterprise tier**:

```bash
az redisenterprise database import --cluster-name $cacheName --resource-group $cacheRg --sas-uris $sasUrl
```

5. Verify the import:

```bash
redis-cli -h <cache-name>.redis.cache.windows.net -p 6380 -a <password> --tls --insecure
```

```bash
KEYS *
```

### Clean up

Delete the pod:

```bash
kubectl delete pod haiku-havoc-hero
```
