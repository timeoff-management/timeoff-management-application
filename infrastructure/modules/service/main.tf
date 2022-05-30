data "aws_ecs_cluster" "service" {
  cluster_name = var.cluster_name
}

resource "aws_lb_target_group" "primary" {
  name        = "tg-${var.cluster_name}-${var.service_name}-1"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 10
    interval            = 300
    matcher             = "200-499"
    path                = "/register"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 120
    unhealthy_threshold = 10
  }

  stickiness {
    cookie_duration = 86400
    enabled         = false
    type            = "lb_cookie"
  }

}

resource "aws_lb_target_group" "secondary" {
  name        = "tg-${var.cluster_name}-${var.service_name}-2"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 10
    interval            = 300
    matcher             = "200-499"
    path                = "/register"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 120
    unhealthy_threshold = 10
  }

  stickiness {
    cookie_duration = 86400
    enabled         = false
    type            = "lb_cookie"
  }
}

resource "aws_lb_listener_rule" "main" {
  listener_arn = var.alb_listener_arn

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.primary.arn
  }

  condition {
    host_header {
      values = ["timeoff-app.dereedere.link"]
    }
  }
}

# TO-DO:
# Figure out how the manage the secondary needed target group

resource "aws_ecs_service" "main" {
  name            = var.service_name
  cluster         = data.aws_ecs_cluster.service.arn
  task_definition = var.task_definition_name
  desired_count   = var.desired_count
  deployment_controller {
    type = "CODE_DEPLOY"
  }
  launch_type = "FARGATE"

  load_balancer {
    target_group_arn = aws_lb_target_group.primary.arn
    container_name   = var.container_name
    container_port   = var.container_port
  }

  network_configuration {
    security_groups = var.security_group_ids
    subnets         = var.subnets
  }

  lifecycle {
    ignore_changes = [
      load_balancer,
      task_definition
    ]
  }

}
