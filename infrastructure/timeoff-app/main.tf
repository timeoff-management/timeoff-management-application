module "timeoff_service_http" {
  source                = "../modules/service"
  vpc_id                = data.terraform_remote_state.global.outputs.vpc_id
  cluster_name          = "core"
  service_name          ="${local.name}-http"
  task_definition_name  = "timeoff:8"
  desired_count         = 1
  container_name        = local.name
  container_port        = 3000
  alb_security_group_id = data.terraform_remote_state.global.outputs.alb_security_group
  subnets               = data.terraform_remote_state.global.outputs.private_subnets
  alb_listener_arn      = data.terraform_remote_state.global.outputs.http_listener_arn
}

module "timeoff_service_https" {
  source                = "../modules/service"
  vpc_id                = data.terraform_remote_state.global.outputs.vpc_id
  cluster_name          = "core"
  service_name          = "${local.name}-https"
  task_definition_name  = "timeoff:8"
  desired_count         = 1
  container_name        = local.name
  container_port        = 3000
  alb_security_group_id = data.terraform_remote_state.global.outputs.alb_security_group
  subnets               = data.terraform_remote_state.global.outputs.private_subnets
  alb_listener_arn      = data.terraform_remote_state.global.outputs.https_listener_arn
}

module "timeoff_build" {
  source                = "../modules/developerTools/build"
  application_name      = local.name
  environment_variables = local.build_variables
  source_version        = "develop"
  github_repository_url = "https://github.com/jimenamorazu/timeoff-management-application.git"
  github_token_ssm_path = "/CodeBuild/Github/access_token"
}

resource "aws_codedeploy_app" "app" {
  compute_platform = "ECS"
  name             = local.name
}

module "timeoff_deploy_http" {
  source = "../modules/developerTools/deployment"

  application_name        = local.name
  listener_arn           = [data.terraform_remote_state.global.outputs.http_listener_arn]
  primary_target_group    = module.timeoff_service_http.primary_target_group
  secondary_target_group  = module.timeoff_service_http.secondary_target_group
  ecs_cluster             = "core"
  ecs_service             = module.timeoff_service_http.service_name
  codedeploy_app_name     = aws_codedeploy_app.app.name
  identifier              = "http"

}

module "timeoff_deploy_https" {
  source = "../modules/developerTools/deployment"

  application_name        = local.name
  listener_arn           = [data.terraform_remote_state.global.outputs.https_listener_arn]
  primary_target_group    = module.timeoff_service_https.primary_target_group
  secondary_target_group  = module.timeoff_service_https.secondary_target_group
  ecs_cluster             = "core"
  ecs_service             = module.timeoff_service_https.service_name
  codedeploy_app_name     = aws_codedeploy_app.app.name
  identifier              = "https"
}

module "timeoff_pipeline" {
  source = "../modules/developerTools/pipeline"

  application_name       = local.name
  codestar_connection    = data.terraform_remote_state.global.outputs.codestar_connection_arn
  repository_id          = "jimenamorazu/timeoff-management-application"
  source_branch          = "develop"
  ecr_repository_name    = data.terraform_remote_state.global.outputs.ecr_repo_name
  codebuid_project_name  = module.timeoff_build.project_name
  codedeploy_app_name    = aws_codedeploy_app.app.name
  codedeploy_group_names = [module.timeoff_deploy_http.deployment_group_name, module.timeoff_deploy_https.deployment_group_name]
}


data "terraform_remote_state" "global" {
  backend = "s3"
  config = {
    bucket = "global-terraform-state"
    key    = "global/network/terraform.tfstate"
    region = "us-east-1"
  }
}

locals {
  name = "timeoff-app"
  build_variables = [
    {
      name  = "dockerhub_password"
      type  = "PARAMETER_STORE"
      value = "/CodeBuild/timeoff-management-application/docker/password"
    },
    {
      name  = "dockerhub_username"
      type  = "PLAINTEXT"
      value = "dereedere"
    },
    {
      name  = "ecr_repo_name"
      type  = "PLAINTEXT"
      value = data.terraform_remote_state.global.outputs.ecr_repo_url
    },
    {
      name  = "image_tag"
      type  = "PLAINTEXT"
      value = "latest"
    },
    {
      name  = "account_id"
      type  = "PLAINTEXT"
      value = "150068533141"
    }
  ]
}