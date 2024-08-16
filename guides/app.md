# Migrate Heroku app to Azure App Service

## Prerequisites

- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
- [Docker](https://docs.docker.com/get-docker/)

## Dockerize Heroku app

It's hard to provide a general guide on how to dockerize a Heroku app, as it depends on the app's structure and dependencies. However, here are some general tips that might help you:

- Use `docker init` in your app directory to generate a custom `Dockerfile` for your app.
- Use a `.dockerignore` file to exclude unnecessary files and directories from the Docker image.
- Use a build cache to speed up the build process.
- Build and test your Docker image locally before pushing it to a registry.

```bash
docker build --tag <my-image-name> .
```

```bash
docker run -it -p 8000:8000 <my-image-name>
```

Browse to `http://localhost:8000` to see your app running.

> [!TIP]
> For a detailed video tutorial on getting started with Docker, check out my **Best Practices for Containerizing Web Apps with Docker** [video](https://www.youtube.com/watch?v=1Guuaf5JTr0).

## Upload to Azure Container Registry

### Create an Azure Container Registry

1. Login to Azure CLI:

```bash
az login
```

2. Create a resource group:

```bash
az group create --name <resource-group> --location <location>
```

3. Create an Azure Container Registry:

```bash
az acr create --resource-group <resource-group> --name <registry-name> --sku Basic
```

4. Fetch the admin credentials for the registry and save for later use:

```bash
az acr credential show --name <registry-name> --resource-group <resource-group>
```

### Build and push the Docker image

1. Build and push the image to ACR using:

```bash
az acr build --registry <registry-name> --image <imageName>:<tag> .
```

2. List the image in the registry:

```bash
az acr repository list --name <registry-name> --output table
```

## Deploy to Azure App Service

### Create a user-assigned managed identity

Azure App Service can either use a default system-assigned managed identity or a user-assigned managed identity to authenticate to a container registry. For best practices, we recommend using a user-assigned managed identity.

1. Create a resource group:

```bash
az group create --name <resource-group> --location <location>
```

2. Create a user-assigned managed identity:

```bash
az identity create --resource-group <resource-group> --name <identity-name>
```

3. Assign the `AcrPull` role to the managed identity:

```bash
principalId=$(az identity show --resource-group <resource-group> --name <identity-name> --query principalId --output tsv)
```

```bash
registryId=$(az acr show --resource-group <resource-group> --name <registry-name> --query id --output tsv)
```

```bash
az role assignment create --assignee $principalId --role acrpull --scope $registryId
```

### Deploy the Azure App Service

Click [here](https://github.com/massdriver-cloud/application-templates/tree/main/azure-app-service) for a production-ready configuration built using Terraform.

1. Create an App Service Plan:

```bash
az appservice plan create --name <plan-name> --resource-group <resource-group> --is-linux
```

_By default, the command uses an inexpensive [B1 pricing tier](https://azure.microsoft.com/pricing/details/app-service/linux/). You can specify a different pricing tier using the `--sku` parameter._

2. Create the Web App:

```bash
az webapp create --resource-group <resource-group> --plan <plan-name> --name <app-name> --deployment-container-image-name <registry-name>.azurecr.io/<imageName>:<tag>
```

_The `<app-name>` must be globally unique._

### Configure the App Service

1. Set the `WEBSITES_PORT` app setting:

```bash
az webapp config appsettings set --resource-group <resource-group> --name <app-name> --settings WEBSITES_PORT=<port>
```

_Also feel free to set other environment variables as needed using the command above. For example, you can set the `DATABASE_URL` or the `CACHE_URL`._

2. Set the managed identity for the App Service:

```bash
id=$(az identity show --resource-group <resource-group> --name <identity-name> --query id --output tsv)
```

```bash
az webapp identity assign --resource-group <resource-group> --name <app-name> --identities $id
```

3. Configure app to pull from Azure Container Registry using managed identity:

```bash
appConfig=$(az webapp config show --resource-group <resource-group> --name <app-name> --query id --output tsv)
```

```bash
az resource update --ids $appConfig --set properties.acrUseManagedIdentityCreds=true
```

4. Set the `Client ID` of your web app to pull from ACR:

```bash
clientId=$(az identity show --resource-group <resource-group> --name <identity-name> --query clientId --output tsv)
```

```bash
az resource update --ids $appConfig --set properties.acrUserManagedIdentityID=$clientId
```

5. Enable CI/CD for the app:

```bash
cicdUrl=$(az webapp deployment container config --enable-cd true --name <app-name> --resource-group <resource-group> --query CI_CD_URL --output tsv)
```

_`CI_CD_URL` is the URL that App Service generates for you. Your registry should use this URL to notify the app service that a new image push has occurred._

6. Create a webhook in your container registry using `CI_CD_URL`:

```bash
az acr webhook create --name <webhook-name> --registry <registry-name> --uri $cicdUrl --actions push --scope <imageName>:<tag>
```

7. Test the webhook:

```bash
eventId=$(az acr webhook ping --name <webhook-name> --registry <registry-name> --query id --output tsv)
```

```bash
az acr webhook list-events --name <webhook-name> --registry <registry-name> --query "[?id=='$eventId'].eventResponseMessage"
```

### Verify the deployment

Browse to the Azure generated URL to see your app running on Azure App Service: `https://<app-name>.azurewebsites.net`

On first load, the app might take a few seconds to start as it pulls the image from the Azure Container Registry. If the browser times out, just refresh the page. Once the initial image is pulled, the browser should load the app quickly.

## Sources

- [Migrate custom software to Azure App service using a custom container](https://learn.microsoft.com/en-us/azure/app-service/tutorial-custom-container?tabs=azure-cli&pivots=container-linux)
- [Top 8 Docker Tips & Tricks for 2024](https://www.docker.com/blog/8-top-docker-tips-tricks-for-2024/)
