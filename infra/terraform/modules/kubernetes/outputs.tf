output "cluster_name" {
  value = aws_eks_cluster.this.name
}

output "cluster_endpoint" {
  description = "Kubernetes API endpoint."
  value       = aws_eks_cluster.this.endpoint
}

output "cluster_certificate_authority" {
  description = "Base64 CA bundle for kubeconfig."
  value       = aws_eks_cluster.this.certificate_authority[0].data
}

output "cluster_security_group_id" {
  description = "Security group EKS manages for control-plane-to-node traffic."
  value       = aws_eks_cluster.this.vpc_config[0].cluster_security_group_id
}

output "oidc_provider_arn" {
  description = "OIDC provider ARN, for IRSA role trust policies."
  value       = aws_iam_openid_connect_provider.this.arn
}

output "oidc_provider_url" {
  value = aws_iam_openid_connect_provider.this.url
}

output "node_role_arn" {
  value = aws_iam_role.node.arn
}

output "kubeconfig_command" {
  description = "Command to configure kubectl against this cluster."
  value       = "aws eks update-kubeconfig --region ${var.region} --name ${aws_eks_cluster.this.name}"
}
