# Migrate Heroku app to Azure Kubernetes Service (AKS)

## Prerequisites

- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
- [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/)
- [Docker](https://docs.docker.com/get-docker/)
- A deployed Azure Kubernetes Service (AKS) cluster

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

1. Log into Azure CLI:

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

### Build and push the Docker image

1. Build and push the image to ACR using:

```bash
az acr build --registry <registry-name> --image <imageName>:<tag> .
```

2. List the image in the registry:

```bash
az acr repository list --name <registry-name> --output table
```

## Deploy to Azure Kubernetes Service

### Create a Kubernetes cluster

1. Create a Kubernetes cluster:

> [!NOTE]
> To run this command, you need to have **Owner** or **Azure account administrator** role.

```bash
az aks create \
  --resource-group <resource-group> \
  --name <cluster-name> \
  --node-count 1 \
  --generate-ssh-keys \
  --attach-acr <registry-name>
```

2. Get the credentials to connect to the cluster:

```bash
az aks get-credentials --resource-group <resource-group> --name <cluster-name>
```

3. Verify the connection:

```bash
kubectl get nodes
```

### Upload the manifest file

1. Get login server address using the `az acr list` command and query for your login server:

```bash
az acr list --resource-group <resource-group> --query "[].{acrLoginServer:loginServer}" --output table
```

2. Create a manifest file for your app `<your-app>.yaml` with the following content:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: <app-name>
spec:
  replicas: 1
  selector:
    matchLabels:
      app: <app-name>
  template:
    metadata:
      labels:
        app: <app-name>
    spec:
      nodeSelector:
        "kubernetes.io/os": linux
      containers:
        - name: <containerName>
          image: <loginServer>.azurecr.io/<imageName>:<tag>
          ports:
            - containerPort: 8000
          env:
            - name: env
              value: "dev"
```

3. Replace `<app-name>`, `<containerName>`, `<loginServer>`, `<imageName>`, and `<tag>` with your values.

4. Save and close the file.

### Deploy the app

1. Run the following command to deploy the app:

```bash
kubectl apply -f app.yaml
```

2. Check the deployment status:

```bash
kubectl get pods
```

### Test the app

1. Monitor the deployment status using:

```bash
kubectl get service <service-name> --watch
```

_The `<service-name>` is the name of the image in your manifest file._

Watch the `EXTERNAL-IP` address for your service to change from `<pending>` to an actual IP address.

2. When the `EXTERNAL-IP` field shows an IP address, open a web browser and navigate to `http://<EXTERNAL-IP>` to see your app running (use `CTRL-C` to stop the `kubectl` watch process).

## Sources

- [Tutorial - Deploy a containerized app to AKS](https://learn.microsoft.com/en-us/azure/aks/tutorial-kubernetes-prepare-app)
- [Top 8 Docker Tips & Tricks for 2024](https://www.docker.com/blog/8-top-docker-tips-tricks-for-2024/)
