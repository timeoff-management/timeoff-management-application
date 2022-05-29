# CODE BUILD

resource "aws_s3_bucket" "artifacts" {
  bucket = "${var.application_name}-artifacts"
}

resource "aws_s3_bucket_acl" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  acl    = "private"
}

resource "aws_iam_role" "code_build" {
  name = "${var.application_name}-codeBuild"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codebuild.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "code_build" {
  role = aws_iam_role.code_build.name

  policy = file("${path.module}/codeBuild.json")
}

resource "aws_codebuild_project" "app" {
  name = "${var.application_name}-build"

  description   = "Build Pipeline for ${var.application_name}"
  build_timeout = "5"
  service_role  = aws_iam_role.code_build.arn

  artifacts {
    type           = "S3"
    location       = "codepipeline-us-east-1-595656245264"
    name           = "timeoff-app"
    namespace_type = "NONE"
    packaging      = "NONE"
  }

  cache {
    type     = "NO_CACHE"
    location = aws_s3_bucket.artifacts.arn
  }
  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:5.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = true


    dynamic "environment_variable" {
      for_each = var.environment_variables
      content {
        type  = environment_variable.value["type"]
        name  = environment_variable.value["name"]
        value = environment_variable.value["value"]
      }

    }
  }

  logs_config {
    cloudwatch_logs {

    }

    s3_logs {
      status = "DISABLED"
    }
  }

  source {
    type            = "GITHUB"
    location        = var.github_repository_url
    git_clone_depth = 1

    insecure_ssl        = false
    report_build_status = false
    git_submodules_config {
      fetch_submodules = false
    }
  }

  source_version = var.source_version

  tags = {
    Environment = "Test"
  }
}

resource "aws_codebuild_source_credential" "code_build" {
  auth_type   = "PERSONAL_ACCESS_TOKEN"
  server_type = "GITHUB"
  token       = data.aws_ssm_parameter.github_token.value
}

data "aws_ssm_parameter" "github_token" {
  name = var.github_token_ssm_path

}