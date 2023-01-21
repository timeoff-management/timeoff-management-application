pipeline {
    agent none

    stages {

        stage('build'){
            agent {
                docker{
                    image 'node:13.0.1-buster-slim'
                    args '-p 5001:3000'   
                    }
                }
            
            steps{
                echo 'Compiling app..'
                sh 'npm install'
            }
            
        }

    stage('Docker Package'){
            agent any

            steps{
                echo 'Building app..'
                script {
                        docker.withRegistry('https://index.docker.io/v1/', 'dockerlogin'){
                        def timeimage = docker.build("jlargaespada/timeapp:v${env.BUILD_ID}", ".")
                        timeimage.push()
                        timeimage.push("${env.BRANCH_NAME}")
                        timeimage.push("latest")
                        timeimage.run("-p 5001:3000 --rm -name time-app")
                }
            } 
        }
    }
    stage('Docker run'){
        steps{
            script{
                timeimage.run("-p 5001:3000 --rm --name time-app")
            }
        }
    }
            stage('Works?') { 
            steps {
                
                input message: 'Finished using the web site? (Click "Proceed" to continue)' 
                 
            }
        }
            stage('Docker stop'){
        steps{
            script{
                timeimage.stop("-name time-app")
            }
        }
    }
    }
     post {
        always {
            echo "Pipeline for time-app run is complete.."
        }
        failure {
		slackSend (channel: "timeoff-management-application", message: "Build failure - ${env.JOB_NAME} ${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)")
        }
        success {
		slackSend (channel: "timeoff-management-application", message: "Build succeeded - ${env.JOB_NAME} ${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)")
        }
    }
}
