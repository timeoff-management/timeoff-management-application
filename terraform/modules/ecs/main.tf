resource "aws_ecs_cluster" "gorilla_cluster" {
  name = "${var.app_name}-ecs-cluster"
  tags = merge(var.tags, {Name= "${var.app_name}-ecs-cluster"})
}

resource "aws_ecr_repository" "gorilla_ecs_repository" {
  name                  = "${var.app_name}-repo"
  image_tag_mutability  = "MUTABLE"
  tags                  = merge(var.tags, {Name= "${var.app_name}-ecr"})
  image_scanning_configuration {
    scan_on_push = false
  }
}

resource "aws_cloudwatch_log_group" "gorilla_clw" {
  name              = "/ecs/${var.app_name}"
  retention_in_days = 7
  tags              = merge(var.tags, {Name= "${var.app_name}-clw"})
}

resource "aws_ecs_task_definition" "gorilla_task" {

    family                      = "${var.app_name}-task"
    requires_compatibilities    = ["FARGATE"]
    task_role_arn               = "arn:aws:iam::980952865757:role/ecsTaskExecutionRole"
    execution_role_arn          = "arn:aws:iam::980952865757:role/ecsTaskExecutionRole"
    network_mode                = "awsvpc"
    cpu                         = 1024
    memory                      = 2048
    tags                        = merge(var.tags, {Name= "${var.app_name}-task"})
    
    runtime_platform {
        operating_system_family = "LINUX"
    }

    container_definitions       = jsonencode([
        {
            name            = "${var.app_name}-container"
            image           = join("",[aws_ecr_repository.gorilla_ecs_repository.repository_url, ":last"])
            cpu             = 1
            memory          = 2
            essential       = true
            portMappings    = [{
                                containerPort = 3000
                                hostPort      = 3000
                            }]
            logConfiguration= {
                logDriver       = "awslogs"
                secretOptions   = null
                options = {
                    awslogs-group           = aws_cloudwatch_log_group.gorilla_clw.name,
                    awslogs-region          = "us-west-2",
                    awslogs-stream-prefix   = "ecs"
                }
            }
        }
    ])    
}

resource "aws_ecs_service" "gorilla_service" {
    name                                = "${var.app_name}-service"
    cluster                             = aws_ecs_cluster.gorilla_cluster.name
    task_definition                     = aws_ecs_task_definition.gorilla_task.arn
    launch_type                         = "FARGATE"
    desired_count                       = 0
    deployment_maximum_percent          = 200
    deployment_minimum_healthy_percent  = 100
    scheduling_strategy                 = "REPLICA"
    health_check_grace_period_seconds   = 120
    enable_ecs_managed_tags             = true
    propagate_tags                      = "SERVICE"
    tags                                = merge(var.tags, {Name= "${var.app_name}-service"})

    deployment_circuit_breaker {
      enable    = true
      rollback  = true
    }

    deployment_controller {
      type = "ECS"
    }

    load_balancer {
      target_group_arn = "${var.target_group_arn}"
      container_name   = "${var.app_name}-container"
      container_port   = "3000"
    }

    network_configuration {
      assign_public_ip  = true
      subnets           = var.subnets
      security_groups   = var.security_groups
    }
}