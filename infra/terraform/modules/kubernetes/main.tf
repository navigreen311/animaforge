/**
 * EKS cluster — the Kubernetes the manifests in k8s/ are written against.
 *
 * Two node groups because the workloads are not interchangeable: the platform
 * services are CPU-bound and always on, while the AI inference workers need
 * GPUs and are expensive enough to scale to zero. The GPU group is tainted so
 * that ordinary pods cannot drift onto it and hold a GPU node awake.
 *
 * Namespaces are not created here. k8s/ already declares
 * animaforge-{platform,ai,governance,data}, and applying them from Terraform
 * as well would give two owners for one object.
 */

resource "aws_eks_cluster" "this" {
  name     = var.cluster_name
  version  = var.kubernetes_version
  role_arn = aws_iam_role.cluster.arn

  vpc_config {
    subnet_ids              = concat(var.private_subnet_ids, var.public_subnet_ids)
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = var.public_access_cidrs
    security_group_ids      = [aws_security_group.cluster.id]
  }

  # Without these the audit trail for "who deleted the deployment" does not exist.
  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  encryption_config {
    provider {
      key_arn = aws_kms_key.secrets.arn
    }
    # Kubernetes Secrets are only base64 in etcd by default.
    resources = ["secrets"]
  }

  access_config {
    # IAM access entries rather than the legacy aws-auth ConfigMap, which had
    # no way to review or revoke access without editing YAML in-cluster.
    authentication_mode                         = "API_AND_CONFIG_MAP"
    bootstrap_cluster_creator_admin_permissions = true
  }

  tags = merge(var.tags, { Name = var.cluster_name })

  depends_on = [
    aws_iam_role_policy_attachment.cluster_policy,
    aws_cloudwatch_log_group.cluster,
  ]
}

resource "aws_cloudwatch_log_group" "cluster" {
  name              = "/aws/eks/${var.cluster_name}/cluster"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

resource "aws_kms_key" "secrets" {
  description             = "Envelope encryption for ${var.cluster_name} Kubernetes secrets"
  enable_key_rotation     = true
  deletion_window_in_days = 30
  tags                    = var.tags
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${var.cluster_name}-eks-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}

resource "aws_security_group" "cluster" {
  name        = "${var.cluster_name}-cluster"
  description = "EKS control plane"
  vpc_id      = var.vpc_id

  egress {
    description = "Control plane to nodes and AWS APIs"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.cluster_name}-cluster" })
}

/* -- IAM: cluster ---------------------------------------------------------- */

resource "aws_iam_role" "cluster" {
  name = "${var.cluster_name}-cluster"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "cluster_policy" {
  role       = aws_iam_role.cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

/* -- IAM: nodes ------------------------------------------------------------ */

resource "aws_iam_role" "node" {
  name = "${var.cluster_name}-node"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "node" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    # Node-level session access without distributing SSH keys.
    "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
  ])

  role       = aws_iam_role.node.name
  policy_arn = each.value
}

resource "aws_iam_role_policy_attachment" "node_app_access" {
  count = var.app_access_policy_arn == null ? 0 : 1

  role       = aws_iam_role.node.name
  policy_arn = var.app_access_policy_arn
}

/* -- node groups ----------------------------------------------------------- */

resource "aws_eks_node_group" "app" {
  cluster_name    = aws_eks_cluster.this.name
  node_group_name = "${var.cluster_name}-app"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.private_subnet_ids

  instance_types = [var.app_instance_type]
  capacity_type  = "ON_DEMAND"
  ami_type       = "AL2023_x86_64_STANDARD"
  disk_size      = 100

  scaling_config {
    desired_size = var.app_min_size
    min_size     = var.app_min_size
    max_size     = var.app_max_size
  }

  update_config {
    max_unavailable = 1
  }

  labels = { workload = "platform" }

  tags = merge(var.tags, { Name = "${var.cluster_name}-app" })

  lifecycle {
    # The cluster autoscaler owns desired_size once it is running; Terraform
    # would otherwise fight it back to the baseline on every apply.
    ignore_changes = [scaling_config[0].desired_size]
  }

  depends_on = [aws_iam_role_policy_attachment.node]
}

resource "aws_eks_node_group" "gpu" {
  count = var.gpu_enabled ? 1 : 0

  cluster_name    = aws_eks_cluster.this.name
  node_group_name = "${var.cluster_name}-gpu"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.private_subnet_ids

  instance_types = [var.gpu_instance_type]
  capacity_type  = "ON_DEMAND"
  ami_type       = "AL2023_x86_64_NVIDIA"
  disk_size      = 200 # model weights are large

  scaling_config {
    desired_size = var.gpu_min_size
    min_size     = var.gpu_min_size
    max_size     = var.gpu_max_size
  }

  labels = { workload = "ai-inference" }

  # Without this taint, ordinary pods schedule onto GPU nodes and keep them
  # from ever scaling back to zero.
  taint {
    key    = "nvidia.com/gpu"
    value  = "true"
    effect = "NO_SCHEDULE"
  }

  tags = merge(var.tags, { Name = "${var.cluster_name}-gpu" })

  lifecycle {
    ignore_changes = [scaling_config[0].desired_size]
  }

  depends_on = [aws_iam_role_policy_attachment.node]
}

/* -- OIDC for IRSA --------------------------------------------------------- */

data "tls_certificate" "oidc" {
  url = aws_eks_cluster.this.identity[0].oidc[0].issuer
}

# Lets a ServiceAccount assume an IAM role directly, so no pod needs static
# AWS credentials in its environment.
resource "aws_iam_openid_connect_provider" "this" {
  url             = aws_eks_cluster.this.identity[0].oidc[0].issuer
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.oidc.certificates[0].sha1_fingerprint]

  tags = var.tags
}

/* -- addons ---------------------------------------------------------------- */

resource "aws_eks_addon" "this" {
  for_each = toset(["vpc-cni", "coredns", "kube-proxy", "aws-ebs-csi-driver"])

  cluster_name                = aws_eks_cluster.this.name
  addon_name                  = each.value
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "PRESERVE"

  tags = var.tags

  depends_on = [aws_eks_node_group.app]
}
