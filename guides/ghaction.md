# Migrate your Heroku CI/CD pipeline to GitHub Actions

## Prerequisites

- Your application code is hosted on GitHub in a public or private repository

## Continuous Integration

1. Copy the link below and replace `<org/username>` and `<repo-name>` with your GitHub organization or username and repository name respectively.

```markdown
https://github.com/<org/username>/<repo-name>/actions/new?category=continuous-integration
```

2. Open the link in your browser and browse the available workflows for continuous integration based on your runtime.

3. Click `Configure` on the workflow you want to use.

4. Make any changes as needed and click `Commit changes` to add the workflow file to your `.github/workflows` directory in your repository.

## Continuous Deployment

### Azure App Service

1. Copy the link below and replace `<org/username>` and `<repo-name>` with your GitHub organization or username and repository name respectively.

```markdown
https://github.com/<org/username>/<repo-name>/new/main?filename=.github/workflows/azure-container-webapp.yml&workflow_template=deployments/azure-container-webapp
```

2. Open the link in your browser to create a new GitHub Actions workflow file for deploying to Azure App Service.

3. Follow the instructions listed in the comments and make changes as needed.

4. Click `Commit changes` to add the workflow file to your `.github/workflows` directory in your repository.

### Azure Kubernetes Service (AKS)

1. Copy the link below and replace `<org/username>` and `<repo-name>` with your GitHub organization or username and repository name respectively.

```markdown
https://github.com/<org/username>/<repo-name>/new/main?filename=.github%2Fworkflows%2Fazure-kubernetes-service.yml&workflow_template=deployments%2Fazure-kubernetes-service
```

2. Open the link in your browser to create a new GitHub Actions workflow file for deploying to Azure Kubernetes Service (AKS).

3. Follow the instructions listed in the comments and make changes as needed.

4. Click `Commit changes` to add the workflow file to your `.github/workflows` directory in your repository.
