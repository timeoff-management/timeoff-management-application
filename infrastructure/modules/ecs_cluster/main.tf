

module "ecs_cluster" {
  source  = "terraform-aws-modules/ecs/aws"
  version = "v3.4.1"

  name               = "${var.env}-${var.name}"
  container_insights = var.container_insights
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy = [
    {
      capacity_provider = "FARGATE_SPOT"
    }
  ]

  tags = var.tags
}