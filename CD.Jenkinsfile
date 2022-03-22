#!/usr/bin/env groovy

def ci = "tfpod-${UUID.randomUUID().toString()}"

podTemplate(
  label: ci,
  containers: [
    containerTemplate(name: 'docker', image: "docker:20.10.13-alpine3.15", ttyEnabled: true, alwaysPullImage: false, command: 'cat'),
    containerTemplate(name: 'kustomize', image: "k8s.gcr.io/kustomize/kustomize:v3.8.7", ttyEnabled: true, alwaysPullImage: false, command: 'cat'),
    containerTemplate(name: 'gcloud', image: "google/cloud-sdk:377.0.0", ttyEnabled: true, alwaysPullImage: false, command: 'cat'),
  ]
) {
  timeout(60){
    timestamps {
      ansiColor('xterm') {
        node(ci) {
          try {
            container('docker') {
              stage('Git checkout') {
                checkout scm
              }
              stage('CD - Build image') {
                last_commit = sh(returnStdout: true, script:"git rev-parse --short HEAD").trim()
                sh("docker build --target=ready --tag dperezro/timeoff:${last_commit} .")
              } // stage end
              stage('CD - Push image') {
                withCredentials([string(credentialsId: 'dockerhub_token', variable: 'dockerhub_token')]) {
                  sh('docker login -u dperezro -p `cat ${dockerhub_token}`')
                }
                sh("docker push dperezro/timeoff:${dockerhub_token}")
              } // stage end
            }
            container('kustomize') {
              stage('CD - Generate K8s manifests from templates') {
                dir("k8s"){
                  sh("/app/kustomize build overlays/dev > app.yaml")
                }
              } // stage end
            }
            container('gcloud') {
              stage('CD - Getting Google credentials') {
                withCredentials([file(credentialsId: 'gcp-sa-key', variable: 'gcp_sa_key')]) {
                  sh('''
                    gcloud auth activate-service-account --key-file=$gcp_sa_key
                    gcloud container clusters get-credentials dev-gke --region us-central1 --project test-snwbr
                    ''')
                }
              } // stage end
              stage('CD - Deploying common K8s manifests') {
                sh('''
                  kubectl apply -f k8s/app.yaml
                  ''')
              } // stage end
          } catch(err) {
            if (err.toString().contains('FlowInterruptedException')) {
              currentBuild.result = 'UNSTABLE'
              echo "Pipeline Aborted/Timed Out"
            } else {
              currentBuild.result = 'FAILURE'
              echo """
                Pipeline failed. Please see error information below:

                ${err}

              """.stripIndent()
            }
          } finally {}
        }
      }
    }
  }
}
