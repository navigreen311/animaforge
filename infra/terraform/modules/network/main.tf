/**
 * VPC and subnets.
 *
 * Three tiers: public subnets for the load balancers, private subnets for the
 * EKS nodes, and isolated subnets for RDS and ElastiCache. The isolated tier
 * has no NAT route at all — the database cannot reach the internet even if a
 * workload on it is compromised.
 */

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, var.availability_zone_count)

  # /20 public, /20 private, /24 isolated per AZ out of a /16. Private gets the
  # room because that is where pods land.
  public_subnets   = [for i, _ in local.azs : cidrsubnet(var.vpc_cidr, 4, i)]
  private_subnets  = [for i, _ in local.azs : cidrsubnet(var.vpc_cidr, 4, i + 6)]
  isolated_subnets = [for i, _ in local.azs : cidrsubnet(var.vpc_cidr, 8, i + 200)]
}

data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true # required for RDS and EKS private endpoints

  tags = merge(var.tags, { Name = "${var.name_prefix}-vpc" })
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags   = merge(var.tags, { Name = "${var.name_prefix}-igw" })
}

/* -- public ---------------------------------------------------------------- */

resource "aws_subnet" "public" {
  count = length(local.azs)

  vpc_id            = aws_vpc.this.id
  cidr_block        = local.public_subnets[count.index]
  availability_zone = local.azs[count.index]

  # Deliberately false. Nothing is launched into these subnets: EKS nodes sit
  # in the private tier and the NAT gateways take an explicit EIP. Leaving it
  # on would silently give a public address to anything placed here later.
  map_public_ip_on_launch = false

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-public-${local.azs[count.index]}"
    # Consumed by the AWS load balancer controller to place internet-facing LBs.
    "kubernetes.io/role/elb" = "1"
  })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-public" })
}

resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

/* -- private --------------------------------------------------------------- */

# One NAT gateway per AZ. A single shared NAT is cheaper but makes that AZ a
# hard dependency for egress from every other one.
resource "aws_eip" "nat" {
  count  = length(local.azs)
  domain = "vpc"
  tags   = merge(var.tags, { Name = "${var.name_prefix}-nat-${local.azs[count.index]}" })
}

resource "aws_nat_gateway" "this" {
  count = length(local.azs)

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags       = merge(var.tags, { Name = "${var.name_prefix}-nat-${local.azs[count.index]}" })
  depends_on = [aws_internet_gateway.this]
}

resource "aws_subnet" "private" {
  count = length(local.azs)

  vpc_id            = aws_vpc.this.id
  cidr_block        = local.private_subnets[count.index]
  availability_zone = local.azs[count.index]

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-private-${local.azs[count.index]}"
    # Placement hint for internal load balancers.
    "kubernetes.io/role/internal-elb" = "1"
  })
}

resource "aws_route_table" "private" {
  count = length(local.azs)

  vpc_id = aws_vpc.this.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.this[count.index].id
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-private-${local.azs[count.index]}" })
}

resource "aws_route_table_association" "private" {
  count = length(aws_subnet.private)

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

/* -- isolated -------------------------------------------------------------- */

resource "aws_subnet" "isolated" {
  count = length(local.azs)

  vpc_id            = aws_vpc.this.id
  cidr_block        = local.isolated_subnets[count.index]
  availability_zone = local.azs[count.index]

  tags = merge(var.tags, { Name = "${var.name_prefix}-isolated-${local.azs[count.index]}" })
}

# Deliberately no 0.0.0.0/0 route: data stores get local VPC routing only.
resource "aws_route_table" "isolated" {
  vpc_id = aws_vpc.this.id
  tags   = merge(var.tags, { Name = "${var.name_prefix}-isolated" })
}

resource "aws_route_table_association" "isolated" {
  count = length(aws_subnet.isolated)

  subnet_id      = aws_subnet.isolated[count.index].id
  route_table_id = aws_route_table.isolated.id
}

/* -- flow logs ------------------------------------------------------------- */

resource "aws_cloudwatch_log_group" "flow_logs" {
  name              = "/aws/vpc/${var.name_prefix}"
  retention_in_days = var.flow_log_retention_days
  tags              = var.tags
}

resource "aws_iam_role" "flow_logs" {
  name = "${var.name_prefix}-vpc-flow-logs"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "vpc-flow-logs.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "flow_logs" {
  name = "${var.name_prefix}-vpc-flow-logs"
  role = aws_iam_role.flow_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams",
      ]
      Resource = "${aws_cloudwatch_log_group.flow_logs.arn}:*"
    }]
  })
}

resource "aws_flow_log" "this" {
  vpc_id               = aws_vpc.this.id
  traffic_type         = "REJECT" # accepted traffic is high-volume and low-signal
  iam_role_arn         = aws_iam_role.flow_logs.arn
  log_destination      = aws_cloudwatch_log_group.flow_logs.arn
  log_destination_type = "cloud-watch-logs"

  tags = merge(var.tags, { Name = "${var.name_prefix}-flow-logs" })
}
