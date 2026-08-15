output "vpc_id" {
  description = "VPC id."
  value       = aws_vpc.this.id
}

output "vpc_cidr" {
  description = "VPC CIDR, used to scope security group ingress."
  value       = aws_vpc.this.cidr_block
}

output "public_subnet_ids" {
  description = "Public subnets, for internet-facing load balancers."
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnets, for EKS nodes."
  value       = aws_subnet.private[*].id
}

output "isolated_subnet_ids" {
  description = "Isolated subnets with no internet route, for RDS and ElastiCache."
  value       = aws_subnet.isolated[*].id
}

output "availability_zones" {
  description = "AZs actually in use."
  value       = local.azs
}
