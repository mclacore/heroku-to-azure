# Migrating Heroku Postgres to Azure Database for PostgreSQL Flexible Server

This guide will walk you through the steps to migrate a Heroku Postgres database to Azure Database for PostgreSQL Flexible Server using private access.

> [!NOTE]
> While this guide is focused on migrating a Heroku Postgres database, most of the steps can be used to migrate any Heroku-based database to Azure with very little modifications.

## Prerequisites

- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli#troubleshooting-the-heroku-cli)
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli)
- Azure PostgreSQL Flexible Server instance up and running with private access enabled ([Terraform example](https://github.com/massdriver-cloud/azure-postgresql-flexible-server))
- [Azure Kubernetes Service (AKS)](/guides/k8s.md#create-a-kubernetes-cluster) cluster up and running within the same virtual network as the Azure PostgreSQL Flexible Server

## Migration

### Capture a backup

1. Log into Heroku CLI:

```bash
heroku login
```

2. Create a backup of your Heroku Postgres database:

```bash
heroku pg:backups:capture --app <app-name>
```

### Download the backup on AKS

In order to download the backup, we need to create a temporary pod in AKS and use it as a jump box. Once the backup is downloaded, we will restore the backup to the Azure PostgreSQL Flexible Server, then delete the temporary pod.

1. Using the Azure CLI, fetch AKS credentials and login:

```bash
az login
```

```bash
az account set --subscription <subscription-id>
```

Install `kubectl` and `kubelogin`:

```bash
az aks install-cli
```

```bash
az aks get-credentials --resource-group <resource-group> --name <aks-cluster-name> --overwrite-existing
```

```bash
kubelogin convert-kubeconfig -l azurecli
```

2. Create a temporary pod manifest file `haiku-havoc-hero.yaml`:

[haiku-havoc-hero](https://github.com/mclacore/haiku-havoc-hero) provides powerful containers that provide the tools needed to migrate data from Heroku to Azure.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: haiku-havoc-hero
  namespace: default
spec:
  containers:
    - name: postgres
      image: mclacore/haiku-havoc-hero:postgres-v1
      env:
        - name: POSTGRES_PASSWORD
          value: password
```

3. Create the temporary pod:

```bash
kubectl apply -f /dir/to/haiku-havoc-hero.yaml
```

4. Exec into the pod:

```bash
kubectl exec -it haiku-havoc-hero -- sh
```

6. Download the backup:

> [!CAUTION]
> If you have **two-factor authentication enabled**, you'll need to append `-i` to the end of the login command, and then use your Heroku API key as your password. The API key can be retrieved using `heroku auth:token` from a trusted terminal, or from the Heroku dashboard under Account Settings.

```bash
heroku login
```

```bash
heroku pg:backups:download --app <app-name>
```

### Restore the backup

Setup your env vars:

```bash
pgrg="<resource-group-name>"
pgname="<server-name>"
database="<database-name>"
```

1. Fetch the Azure PostgresQL Flexible Server FQDN and username using Azure CLI:

```bash
az login
```

Find the FQDN and username:

```bash
fqdn=$(az postgres flexible-server show --resource-group $pgrg --name $pgname --query "fullyQualifiedDomainName" --output tsv)
```

```bash
username=$(az postgres flexible-server show --resource-group $pgrg --name $pgname --query "administratorLogin" --output tsv)
```

2. Restore the backup to the Azure PostgreSQL Flexible Server:

```bash
pg_restore --verbose --no-owner -h $fqdn -U $username -d $database latest.dump
```

_You can confirm the restoration by running the following:_

```bash
psql -h $fqdn -U $username -d $database -c "\dt"
```

### Delete the temporary pod

```bash
kubectl delete pod postgres
```
