pipeline {
    agent any

    tools {
        nodejs 'nodejs'
    }

    stages {
        stage(build){
            steps{
                echo 'Compiling app..'
                sh 'npm install'
            }
            
        }
        stage(test){
            steps{
                echo 'Testing app..'
                sh 'npm install'
                sh 'npm test'
            }

        }
    }
     post {
        always {
            echo "Pipeline for InstaApp run is complete.."
        }
        failure {
		slackSend (channel: "timeoff-management-application", message: "Build failure - ${env.JOB_NAME} ${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)")
        }
        success {
		slackSend (channel: "timeoff-management-application", message: "Build succeeded - ${env.JOB_NAME} ${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)")
        }
    }
}