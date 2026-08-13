# AWS Deployment — EC2 to EKS

When deploying the FastAPI backend on an EC2 instance and using an EKS cluster:

```
EC2
 │
 │ IAM Role
 ▼
EKS Access Entry
 │
 │ Kubernetes permissions
 ▼
EKS API Server
```

---

## 1. Attach IAM Role to EC2

Create an IAM role for the backend application and attach it to the EC2 instance.

The application receives temporary AWS credentials through the EC2 IAM role.

---

## 2. Give the IAM Role Access to EKS

Create an EKS Access Entry:

```bash
aws eks create-access-entry \
  --cluster-name my-eks \
  --principal-arn arn:aws:iam::<ACCOUNT_ID>:role/MyFastAPI-Role \
  --type STANDARD
```

Associate the required access policy:

```bash
aws eks associate-access-policy \
  --cluster-name my-eks \
  --principal-arn arn:aws:iam::<ACCOUNT_ID>:role/MyFastAPI-Role \
  --access-scope type=cluster \
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy
```

This allows the IAM role to access and view Kubernetes resources.

---

## 3. Configure kubectl on EC2

```bash
aws eks update-kubeconfig \
  --region ap-south-1 \
  --name my-eks
```

Test the connection:

```bash
kubectl get pods -A
```

---

## 4. Application Execution Flow

The FastAPI application continues using the existing Kubernetes executor:

```
FastAPI
   ↓
KubectlExecutor
   ↓
subprocess.run()
   ↓
kubectl get pods
   ↓
EKS authentication
   ↓
EC2 IAM Role
   ↓
EKS Access Entry
   ↓
Kubernetes permissions
   ↓
EKS API Server
   ↓
Pod information
```


"I would containerize my Next.js frontend and FastAPI backend, push both images to Amazon ECR, and run them as separate ECS Fargate services behind an Application Load Balancer. My backend would use an IAM task role with access to the target EKS cluster through an EKS access entry and Kubernetes permissions. The backend would then use kubectl to collect pods, logs, events, deployments, and services, send the collected evidence to OpenRouter for AI analysis, and return the diagnosis to the frontend."



# AWS Deployment — ECS Fargate

```
Docker Images
     ↓
    ECR
     ↓
ECS Fargate
 ├── Frontend :3000
 └── Backend  :8000
        │
        ├──→ OpenRouter
        │
        └──→ EKS
```

---

## Steps

### 1. Build & Push Images

```bash
docker build -t frontend ./frontend
docker build -t backend ./backend
```

Push both images to Amazon ECR.

### 2. Run Containers

- Create an ECS Fargate cluster.
- Create Frontend and Backend services using the ECR images.

### 3. Connect Through ALB

```
app.example.com → Frontend
api.example.com → Backend
```

Frontend:

```
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

### 4. Backend → EKS

```
Backend ECS
    ↓
IAM Task Role
    ↓
EKS Access Entry
    ↓
EKS
```

Give the ECS task IAM role the required EKS/Kubernetes read permissions.

### 5. Remove Local kubeconfig Mount

Don't use:

```
~/.kube:/root/.kube:ro
```

in production. The ECS task uses its AWS IAM identity to access EKS.

---

## Final Flow

```
User
 ↓
ALB
 ↓
Frontend
 ↓
Backend
 ↓
kubectl
 ↓
EKS
 ↓
Kubernetes data
 ↓
OpenRouter
 ↓
LLM
 ↓
Diagnosis
 ↓
Frontend
```


