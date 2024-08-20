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
imageName="herokutoazure"
```

```bash
docker build --tag $imageName .
```

```bash
docker run -it -p 8000:8000 $imageName
```

Browse to `http://localhost:8000` to see your app running.

> [!TIP]
> For a detailed video tutorial on getting started with Docker, check out my **Best Practices for Containerizing Web Apps with Docker** [video](https://www.youtube.com/watch?v=1Guuaf5JTr0).

## Upload to Azure Container Registry

### Create an Azure Container Registry

Setup your env vars (feel free to change these):

```bash
acrRg="herokutoazure"
acrName="herokutoazure"
location="eastus"
tag="latest"
```

1. Login to Azure CLI:

```bash
az login
```

2. Create a resource group:

```bash
az group create --name $acrRg --location $location
```

3. Create an Azure Container Registry:

```bash
az acr create --resource-group $acrRg --name $acrName --sku Basic
```

4. Fetch the admin credentials for the registry and save for later use:

```bash
az acr update --name $acrName --admin-enabled true
```

```bash
az acr credential show --name $acrName --resource-group $acrRg
```

### Build and push the Docker image

1. Build and push the image to ACR using:

```bash
az acr build --registry $acrName --image $imageName:$tag .
```

2. List the image in the registry:

```bash
az acr repository list --name $acrName --output table
```

## Deploy to Azure App Service

### Create a user-assigned managed identity

Click [here](https://github.com/massdriver-cloud/application-templates/tree/main/azure-app-service) for a production-ready configuration built using Terraform.

Azure App Service can either use a default system-assigned managed identity or a user-assigned managed identity to authenticate to a container registry. For best practices, we recommend using a user-assigned managed identity.

Setup more env vars (feel free to change these):

```bash
appRg="herokutoazureapp"
appName="herokutoazureapp" # Must be globally unique
webhookName="herokutoazurewebhook"
appPort="8080"
```

1. Create a resource group:

```bash
az group create --name $appRg --location $location
```

2. Create a user-assigned managed identity:

```bash
az identity create --resource-group $appRg --name $appName
```

3. Assign the `AcrPull` role to the managed identity:

```bash
principalId=$(az identity show --resource-group $appRg --name $appName --query principalId --output tsv)
```

```bash
registryId=$(az acr show --resource-group $acrRg --name $acrName --query id --output tsv)
```

```bash
az role assignment create --assignee $principalId --role acrpull --scope $registryId
```

### Deploy the Azure App Service

1. Create an App Service Plan:

```bash
az appservice plan create --name $appName --resource-group $appRg --is-linux
```

_By default, the command uses an inexpensive [B1 pricing tier](https://azure.microsoft.com/pricing/details/app-service/linux/). You can specify a different pricing tier using the `--sku` parameter._

2. Create the Web App:

```bash
az webapp create --resource-group $appRg --plan $appName --name $appName --deployment-container-image-name $acrName.azurecr.io/$imageName:$tag
```

### Configure the App Service

1. Set the `WEBSITES_PORT` app setting:

```bash
az webapp config appsettings set --resource-group $appRg --name $appName --settings WEBSITES_PORT=$appPort
```

_Also feel free to set other environment variables as needed using the command above. For example, you can set the `DATABASE_URL` or the `CACHE_URL`._

2. Set the managed identity for the App Service:

```bash
id=$(az identity show --resource-group $appRg --name $appName --query id --output tsv)
```

```bash
az webapp identity assign --resource-group $appRg --name $appName --identities $id
```

3. Configure app to pull from Azure Container Registry using managed identity:

```bash
appConfig=$(az webapp config show --resource-group $appRg --name $appName --query id --output tsv)
```

```bash
az resource update --ids $appConfig --set properties.acrUseManagedIdentityCreds=true
```

4. Set the `Client ID` of your web app to pull from ACR:

```bash
clientId=$(az identity show --resource-group $appRg --name $appName --query clientId --output tsv)
```

```bash
az resource update --ids $appConfig --set properties.acrUserManagedIdentityID=$clientId
```

5. Enable CI/CD for the app:

```bash
cicdUrl=$(az webapp deployment container config --enable-cd true --name $appName --resource-group $appRg --query CI_CD_URL --output tsv)
```

_`CI_CD_URL` is the URL that App Service generates for you. Your registry should use this URL to notify the app service that a new image push has occurred._

6. Create a webhook in your container registry using `CI_CD_URL`:

```bash
az acr webhook create --name $webhookName --registry $acrName --uri $cicdUrl --actions push --scope $acrName.azurecr.io
```

7. Test the webhook:

```bash
eventId=$(az acr webhook ping --name $webhookName --registry $acrName --query id --output tsv)
```

```bash
az acr webhook list-events --name $webhookName --registry $acrName --query "[?id=='$eventId'].eventResponseMessage"
```

### Verify the deployment

Browse to the Azure generated URL to see your app running on Azure App Service: `https://<app-name>.azurewebsites.net`

On first load, the app might take a few seconds to start as it pulls the image from the Azure Container Registry. If the browser times out, just refresh the page. Once the initial image is pulled, the browser should load the app quickly.

## Sources

- [Migrate custom software to Azure App service using a custom container](https://learn.microsoft.com/en-us/azure/app-service/tutorial-custom-container?tabs=azure-cli&pivots=container-linux)
- [Top 8 Docker Tips & Tricks for 2024](https://www.docker.com/blog/8-top-docker-tips-tricks-for-2024/)
