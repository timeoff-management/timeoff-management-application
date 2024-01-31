resource "aws_codedeploy_deployment_group" "app" {
  app_name               = var.codedeploy_app_name
  deployment_config_name = "CodeDeployDefault.ECSCanary10Percent5Minutes"
  deployment_group_name  = "AppECS-${var.ecs_cluster}-${var.ecs_service}"
  service_role_arn       = aws_iam_role.code_deploy.arn

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE", "DEPLOYMENT_STOP_ON_REQUEST", ]
  }

  blue_green_deployment_config {
    deployment_ready_option {
      action_on_timeout = "CONTINUE_DEPLOYMENT"
    }

    terminate_blue_instances_on_deployment_success {
      action                           = "TERMINATE"
      termination_wait_time_in_minutes = 5
    }
  }

  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }

  ecs_service {
    cluster_name = var.ecs_cluster
    service_name = var.ecs_service
  }

  load_balancer_info {
    target_group_pair_info {
      prod_traffic_route {
        listener_arns = var.listener_arn
      }
      target_group {
        name = var.primary_target_group
      }

      target_group {
        name = var.secondary_target_group
      }
    }
  }
}


resource "aws_iam_role" "code_deploy" {
  name = "${var.ecs_cluster}-${var.ecs_service}-CodeDeploy"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codedeploy.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "base_policy" {
  role       = aws_iam_role.code_deploy.name
  policy_arn = "arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS"
}

