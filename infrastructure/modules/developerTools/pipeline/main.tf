
resource "aws_codepipeline" "build" {
  name     = "${var.application_name}-build"
  role_arn = aws_iam_role.codepipeline_role.arn

  artifact_store {
    location = var.codepipeline_bucket
    type     = "S3"

  }
  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["build"]


      configuration = {
        ConnectionArn        = var.codestar_connection
        FullRepositoryId     = var.repository_id
        BranchName           = var.source_branch
        DetectChanges        = true
        OutputArtifactFormat = "CODEBUILD_CLONE_REF"

      }
    }
  }

  stage {
    name = "Build"

    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      input_artifacts  = ["build"]
      output_artifacts = ["BuildArtifact"]
      version          = "1"

      configuration = {
        ProjectName = var.codebuid_project_name
      }
    }
  }

}

resource "aws_codepipeline" "deploy" {
  name     = "${var.application_name}-deploy"
  role_arn = aws_iam_role.codepipeline_role.arn

  artifact_store {
    location = var.codepipeline_bucket
    type     = "S3"

  }
  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["SourceArtifact"]


      configuration = {
        ConnectionArn        = var.codestar_connection
        FullRepositoryId     = var.repository_id
        BranchName           = var.source_branch
        DetectChanges        = false
        OutputArtifactFormat = "CODE_ZIP"

      }
    }

    action {
      category = "Source"
      configuration = {
        "ImageTag"       = "latest"
        "RepositoryName" = var.ecr_repository_name
      }
      input_artifacts = []
      name            = "ECR"
      output_artifacts = [
        "MyImage",
      ]
      owner     = "AWS"
      provider  = "ECR"
      region    = "us-east-1"
      run_order = 1
      version   = "1"
    }
  }

  stage {
    name = "Deploy"
    dynamic "action" {
    for_each = var.codedeploy_group_names
    content {
        name     = "Deploy${index(var.codedeploy_group_names, action.value) + 1}"
        category = "Deploy"
        owner    = "AWS"
        provider = "CodeDeployToECS"
        input_artifacts = [
          "SourceArtifact",
          "MyImage"
        ]
        version = "1"

        configuration = {
          "AppSpecTemplateArtifact"        = "SourceArtifact"
          "AppSpecTemplatePath"            = "appspec.yml"
          "ApplicationName"                = var.codedeploy_app_name
          "DeploymentGroupName"            = action.value
          "Image1ArtifactName"             = "MyImage"
          "Image1ContainerName"            = "IMAGE_NAME"
          "TaskDefinitionTemplateArtifact" = "SourceArtifact"
          "TaskDefinitionTemplatePath"     = "taskdef.json"
        }
    }
  }

  }
  

}

resource "aws_iam_role" "codepipeline_role" {
  name = "${var.application_name}-CodePipeline"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codepipeline.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "code_deploy" {
  role = aws_iam_role.codepipeline_role.name

  policy = file("${path.module}/codePipeline.json")
}

# Cloudwatch event rule  to trigger pipeline
resource "aws_cloudwatch_event_rule" "ecr_activity" {
  name_prefix = "${var.application_name}-ecr-activity"
  description = "Detect push to ecr repo of ${var.application_name}"

  event_pattern = <<PATTERN
   {
    "source": ["aws.ecr"],
    "detail": {
    "action-type": ["PUSH"],
    "image-tag": ["latest"],
    "repository-name": ["core"],
    "result": ["SUCCESS"]
   },
  "detail-type": ["ECR Image Action"]
  }
 PATTERN
}

resource "aws_cloudwatch_event_target" "cloudwatch_triggers_pipeline" {
  target_id = "${var.application_name}-ecr-trigger"
  rule      = aws_cloudwatch_event_rule.ecr_activity.name
  arn       = aws_codepipeline.deploy.arn
  role_arn  = aws_iam_role.cloudwatch_ci_role.arn
}

# Allows the CloudWatch event to assume roles
resource "aws_iam_role" "cloudwatch_ci_role" {
  name_prefix = "${var.application_name}-cloudwatch-ci-"

  assume_role_policy = <<DOC
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "events.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
DOC
}
data "aws_iam_policy_document" "cloudwatch_ci_iam_policy" {
  statement {
    actions = [
      "iam:PassRole"
    ]
    resources = [
      "*"
    ]
  }
  statement {
    # Allow CloudWatch to start the Pipeline
    actions = [
      "codepipeline:StartPipelineExecution"
    ]
    resources = [
      aws_codepipeline.deploy.arn
    ]
  }
}
resource "aws_iam_policy" "cloudwatch_ci_iam_policy" {
  name_prefix = "${var.application_name}-ci-"
  policy      = data.aws_iam_policy_document.cloudwatch_ci_iam_policy.json
}
resource "aws_iam_role_policy_attachment" "cloudwatch_ci_iam" {
  policy_arn = aws_iam_policy.cloudwatch_ci_iam_policy.arn
  role       = aws_iam_role.cloudwatch_ci_role.name
}